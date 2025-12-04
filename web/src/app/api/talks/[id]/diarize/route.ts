/**
 * 話者識別API（BatchRecognize）
 *
 * POST /api/talks/:id/diarize
 * 会話終了後に音声ファイル全体をBatchRecognizeで処理し、話者タグを更新
 */

import { v2 } from "@google-cloud/speech";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5分

// 言語コードを変換
function convertLanguageCode(lang: string): string {
  const mapping: Record<string, string> = {
    ja: "ja-JP",
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    zh: "zh-CN",
    ko: "ko-KR",
  };
  return mapping[lang] || "ja-JP";
}

/**
 * 話者識別の実行（内部関数）
 */
export async function executeDiarization(
  talkId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  console.log(`[Diarize] Starting diarization for talk: ${talkId}`);

  try {
    // Talkデータ取得
    const { data: talk, error: talkError } = await supabase
      .from("talks")
      .select("*")
      .eq("id", talkId)
      .single();

    if (talkError || !talk) {
      console.error("[Diarize] Talk not found:", talkError);
      throw new Error("Talk not found");
    }

    // 音声ファイルのGCS URIを取得
    // Supabase Storageのバケット名は "audio-files"、ファイルパスは "{talkId}.webm"
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "aibond-storage";
    const audioUri = `gs://${bucketName}/audio-files/${talkId}.webm`;
    console.log(`[Diarize] Audio URI: ${audioUri}`);

    // GCP認証情報取得
    const credentialsPath = process.env.AIBOND_GCP_CREDENTIALS_PATH;
    if (!credentialsPath || !fs.existsSync(credentialsPath)) {
      console.error("[Diarize] Credentials not found");
      throw new Error("GCP credentials not configured");
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    const projectId = credentials.project_id;

    // SpeechClient作成
    const speechClient = new v2.SpeechClient({
      credentials,
      apiEndpoint: "asia-northeast1-speech.googleapis.com",
    });

    // ユーザーの言語を取得
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("language")
      .eq("id", user.id)
      .single();

    const sourceLanguage = profile?.language || "ja";

    // Recognizer設定
    const recognizerPath = `projects/${projectId}/locations/asia-northeast1/recognizers/_`;

    // RecognitionConfig
    const recognitionConfig = {
      explicitDecodingConfig: {
        encoding: "WEBM_OPUS" as const,
        sampleRateHertz: 48000,
        audioChannelCount: 1,
      },
      languageCodes: [convertLanguageCode(sourceLanguage)],
      model: "chirp_3",
      features: {
        enableAutomaticPunctuation: true,
        diarizationConfig: {
          enableSpeakerDiarization: true,
          minSpeakerCount: 2,
          maxSpeakerCount: 2,
        },
      },
    };

    console.log(`[Diarize] Starting BatchRecognize with chirp_3 model`);

    // BatchRecognizeリクエスト
    const [operation] = await speechClient.batchRecognize({
      recognizer: recognizerPath,
      config: recognitionConfig,
      files: [
        {
          uri: audioUri,
        },
      ],
      recognitionOutputConfig: {
        inlineResponseConfig: {},
      },
    });

    console.log(`[Diarize] Operation started, waiting for completion...`);

    // 結果を待つ
    const [response] = await operation.promise();

    console.log(`[Diarize] Operation completed, processing results`);

    // 結果から話者タグ付きのトランスクリプトを抽出
    const results = response.results?.[audioUri];
    if (!results || !results.transcript || !results.transcript.results) {
      console.error("[Diarize] No results found");
      throw new Error("No transcription results");
    }

    // 各トランスクリプトセグメントから話者タグを抽出
    const transcriptSegments: Array<{
      text: string;
      speakerTag: number;
      startTime: number;
      endTime: number;
    }> = [];

    for (const result of results.transcript.results) {
      if (result.alternatives && result.alternatives.length > 0) {
        const alternative = result.alternatives[0];
        const text = alternative.transcript || "";

        // wordsから話者タグを抽出
        const words = alternative.words || [];
        if (words.length > 0) {
          // 最頻出の話者タグを取得
          const speakerTags = words
            .map((w: any) => w.speakerTag)
            .filter((tag: any): tag is number => tag !== undefined && tag !== null);

          if (speakerTags.length > 0) {
            const counts: Record<number, number> = {};
            speakerTags.forEach((tag: number) => {
              counts[tag] = (counts[tag] || 0) + 1;
            });
            const speakerTag = parseInt(
              Object.keys(counts).sort((a, b) => counts[parseInt(b)] - counts[parseInt(a)])[0]
            );

            // 開始・終了時間を取得
            const startTime = words[0].startOffset?.seconds || 0;
            const endTime = words[words.length - 1].endOffset?.seconds || 0;

            transcriptSegments.push({
              text,
              speakerTag,
              startTime: Number(startTime),
              endTime: Number(endTime),
            });

            console.log(`[Diarize] Segment: speaker=${speakerTag}, text="${text.substring(0, 50)}"`);
          }
        }
      }
    }

    console.log(`[Diarize] Found ${transcriptSegments.length} segments with speaker tags`);

    // DBからtalk_messagesを取得
    const { data: messages, error: messagesError } = await supabase
      .from("talk_messages")
      .select("*")
      .eq("talk_id", talkId)
      .order("created_at", { ascending: true });

    if (messagesError || !messages) {
      console.error("[Diarize] Failed to fetch messages:", messagesError);
      throw new Error("Failed to fetch messages");
    }

    console.log(`[Diarize] Found ${messages.length} messages in DB`);

    // テキストマッチングで話者タグを更新
    let updatedCount = 0;
    for (const message of messages) {
      // セグメントから最も近いものを見つける（テキストの類似度で判定）
      let bestMatch: typeof transcriptSegments[0] | null = null;
      let bestSimilarity = 0;

      for (const segment of transcriptSegments) {
        // シンプルな類似度計算（部分一致）
        const messageText = message.original_text.trim().toLowerCase();
        const segmentText = segment.text.trim().toLowerCase();

        if (messageText === segmentText) {
          bestMatch = segment;
          break;
        } else if (segmentText.includes(messageText) || messageText.includes(segmentText)) {
          const similarity = Math.min(messageText.length, segmentText.length) /
                            Math.max(messageText.length, segmentText.length);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = segment;
          }
        }
      }

      if (bestMatch && bestSimilarity > 0.5) {
        // 話者タグを更新
        const { error: updateError } = await supabase
          .from("talk_messages")
          .update({ speaker_tag: bestMatch.speakerTag })
          .eq("id", message.id);

        if (updateError) {
          console.error(`[Diarize] Failed to update message ${message.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`[Diarize] Updated message ${message.id} with speaker tag ${bestMatch.speakerTag}`);
        }
      }
    }

    console.log(`[Diarize] Successfully updated ${updatedCount}/${messages.length} messages`);

    return {
      success: true,
      updatedCount,
      totalMessages: messages.length,
    };
  } catch (error) {
    console.error("[Diarize] Error:", error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const talkId = params.id;

  try {
    const result = await executeDiarization(talkId, supabase);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Diarize] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

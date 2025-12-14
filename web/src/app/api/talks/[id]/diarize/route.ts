/**
 * 話者識別API（BatchRecognize）
 *
 * POST /api/talks/:id/diarize
 * 会話終了後に音声ファイル全体をBatchRecognizeで処理し、話者タグを更新
 */

import { v2 } from "@google-cloud/speech";
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAudioGcsUri } from "@/lib/gcs/client";
import * as fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5分

// 言語コードを変換
function convertLanguageCode(lang: string): string {
  const mapping: Record<string, string> = {
    ja: "ja-JP",
    en: "en-US",
    zh: "cmn-Hans-CN", // 中国語（簡体字）
    ko: "ko-KR",
    es: "es-ES",
    pt: "pt-BR", // ポルトガル語（ブラジル）
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
    const audioUri = getAudioGcsUri(talkId);
    console.log(`[Diarize] Audio URI: ${audioUri}`);

    // GCP認証情報取得
    const credentialsPath = process.env.AIBOND_GCP_CREDENTIALS_PATH;
    let credentials: any = null;
    let projectId: string;

    if (credentialsPath && fs.existsSync(credentialsPath)) {
      // ローカル開発: サービスアカウントキーファイルを使用
      credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
      projectId = credentials.project_id;
      console.log("[Diarize] Using credentials from file");
    } else {
      // Cloud Run: デフォルト認証を使用
      projectId = process.env.GOOGLE_CLOUD_PROJECT || "aibond-479715";
      console.log("[Diarize] Using default credentials");
    }

    // SpeechClient作成
    const speechClient = credentials
      ? new v2.SpeechClient({
          credentials,
          apiEndpoint: "asia-northeast1-speech.googleapis.com",
        })
      : new v2.SpeechClient({
          apiEndpoint: "asia-northeast1-speech.googleapis.com",
        });

    // ユーザーの言語を取得（talk.owner_user_idを使用）
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("language")
      .eq("id", talk.owner_user_id)
      .single();

    const sourceLanguage = profile?.language || "ja";

    // Recognizer設定
    const recognizerPath = `projects/${projectId}/locations/asia-northeast1/recognizers/_`;

    // RecognitionConfig
    // Note: For chirp_3 model, diarization uses an empty config (auto-detected)
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
        diarizationConfig: {}, // Empty config for chirp_3 - auto speaker detection
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

    // デバッグ: レスポンス構造を確認
    console.log(`[Diarize] Response keys:`, Object.keys(response));
    console.log(`[Diarize] Results keys:`, response.results ? Object.keys(response.results) : 'none');

    // 結果から話者タグ付きのトランスクリプトを抽出
    const results = response.results?.[audioUri];
    if (!results || !results.transcript || !results.transcript.results) {
      console.error("[Diarize] No results found. Full response:", JSON.stringify(response, null, 2).substring(0, 1000));
      throw new Error("No transcription results");
    }

    console.log(`[Diarize] Transcript results count:`, results.transcript.results.length);

    // 全ての単語を収集（セグメント化せず、個別の単語レベルで保持）
    const allWords: Array<{
      word: string;
      normalizedWord: string; // マッチング用の正規化済み単語
      speakerTag: number;
      startTime: number;
      endTime: number;
    }> = [];

    for (const result of results.transcript.results) {
      if (result.alternatives && result.alternatives.length > 0) {
        const alternative = result.alternatives[0];
        const words = alternative.words || [];

        // デバッグ: 最初のwords構造を確認
        if (allWords.length === 0 && words.length > 0) {
          console.log(`[Diarize] First words sample:`, JSON.stringify(words.slice(0, 5), null, 2));
        }

        for (const w of words as any[]) {
          // V2 API uses speakerLabel (string), V1 uses speakerTag (number)
          let speakerTag: number | undefined;
          if (w.speakerLabel !== undefined && w.speakerLabel !== null && w.speakerLabel !== "") {
            speakerTag = parseInt(w.speakerLabel, 10);
          } else if (w.speakerTag !== undefined) {
            speakerTag = w.speakerTag;
          }

          const wordText = w.word || "";
          if (speakerTag !== undefined && !isNaN(speakerTag) && wordText) {
            allWords.push({
              word: wordText,
              normalizedWord: wordText.replace(/[\s。、．，！？!?・]/g, "").toLowerCase(),
              speakerTag,
              startTime: Number(w.startOffset?.seconds || 0) * 1000 + Number(w.startOffset?.nanos || 0) / 1000000,
              endTime: Number(w.endOffset?.seconds || 0) * 1000 + Number(w.endOffset?.nanos || 0) / 1000000,
            });
          }
        }
      }
    }

    console.log(`[Diarize] Total words with speaker tags: ${allWords.length}`);

    // 話者統計をログ出力
    const speakerCounts: Record<number, number> = {};
    for (const w of allWords) {
      speakerCounts[w.speakerTag] = (speakerCounts[w.speakerTag] || 0) + 1;
    }
    console.log(`[Diarize] Speaker word counts:`, speakerCounts);

    // デバッグ: 最初の20単語の話者情報を表示
    console.log(`[Diarize] First 20 words with speakers:`);
    allWords.slice(0, 20).forEach((w, i) => {
      console.log(`  ${i + 1}. speaker=${w.speakerTag}, word="${w.word}"`);
    });

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

    // 非同期処理でのRLSバイパス用にadminクライアントを使用
    const adminClient = createAdminClient();

    // 単語レベルのマッチングで話者タグを決定
    // 各メッセージに対して、含まれる単語の話者を多数決で決定
    let updatedCount = 0;
    let wordIndex = 0; // allWords内の現在位置を追跡

    for (const message of messages) {
      // メッセージテキストを正規化
      const messageText = message.original_text
        .trim()
        .replace(/[\s。、．，！？!?・]/g, "")
        .toLowerCase();

      if (messageText.length === 0) {
        console.log(`[Diarize] Skipping empty message`);
        continue;
      }

      // このメッセージにマッチする単語を探す
      // 連続する単語を結合して、メッセージテキストと一致するか確認
      const speakerVotes: Record<number, number> = {};
      let matchedWords: typeof allWords = [];
      let bestMatchStart = -1;
      let bestMatchLength = 0;

      // スライディングウィンドウで最長一致を探す
      for (let startIdx = Math.max(0, wordIndex - 10); startIdx < allWords.length; startIdx++) {
        let concatenated = "";
        let wordsInRange: typeof allWords = [];

        for (let endIdx = startIdx; endIdx < allWords.length && concatenated.length < messageText.length + 50; endIdx++) {
          concatenated += allWords[endIdx].normalizedWord;
          wordsInRange.push(allWords[endIdx]);

          // メッセージテキストが連結テキストに含まれているかチェック
          if (concatenated.includes(messageText)) {
            // より長いマッチを優先
            if (wordsInRange.length > bestMatchLength ||
                (wordsInRange.length === bestMatchLength && startIdx >= wordIndex)) {
              bestMatchStart = startIdx;
              bestMatchLength = wordsInRange.length;
              matchedWords = [...wordsInRange];
            }
            break;
          }

          // 完全一致
          if (concatenated === messageText) {
            bestMatchStart = startIdx;
            bestMatchLength = wordsInRange.length;
            matchedWords = [...wordsInRange];
            break;
          }
        }
      }

      // マッチした単語から話者を多数決で決定
      if (matchedWords.length > 0) {
        // 各単語の話者をカウント
        for (const w of matchedWords) {
          speakerVotes[w.speakerTag] = (speakerVotes[w.speakerTag] || 0) + 1;
        }

        // 最多投票の話者を選択
        let bestSpeaker = 0;
        let maxVotes = 0;
        for (const [speaker, votes] of Object.entries(speakerVotes)) {
          if (votes > maxVotes) {
            maxVotes = votes;
            bestSpeaker = parseInt(speaker, 10);
          }
        }

        // 話者タグを更新（0→1, 1→2 に変換して保存）
        const speakerTagForDb = bestSpeaker + 1;
        const { error: updateError } = await adminClient
          .from("talk_messages")
          .update({ speaker_tag: speakerTagForDb })
          .eq("id", message.id);

        if (updateError) {
          console.error(`[Diarize] Failed to update message ${message.id}:`, updateError);
        } else {
          updatedCount++;
          // 投票結果を詳細にログ出力
          const voteDetails = Object.entries(speakerVotes)
            .map(([s, v]) => `speaker${parseInt(s) + 1}:${v}`)
            .join(", ");
          console.log(`[Diarize] Updated "${message.original_text.substring(0, 25)}..." → speaker${speakerTagForDb} (votes: ${voteDetails}, words: ${matchedWords.length})`);
        }

        // 次のメッセージのために位置を更新
        if (bestMatchStart >= 0) {
          wordIndex = bestMatchStart + matchedWords.length;
        }
      } else {
        // マッチする単語が見つからない場合、フォールバック: 全単語から類似度で探す
        console.log(`[Diarize] No word match for: "${message.original_text.substring(0, 30)}..." - trying fallback`);

        // フォールバック: 最も近い単語列を探す
        let bestFallbackSpeaker = 1; // デフォルト
        let bestSimilarity = 0;

        for (let startIdx = 0; startIdx < allWords.length; startIdx++) {
          let concatenated = "";
          const localVotes: Record<number, number> = {};

          for (let endIdx = startIdx; endIdx < Math.min(startIdx + 30, allWords.length); endIdx++) {
            concatenated += allWords[endIdx].normalizedWord;
            localVotes[allWords[endIdx].speakerTag] = (localVotes[allWords[endIdx].speakerTag] || 0) + 1;

            // 類似度計算（共通文字数 / 最大長）
            const commonLen = Math.min(messageText.length, concatenated.length);
            let matchChars = 0;
            for (let i = 0; i < commonLen; i++) {
              if (messageText[i] === concatenated[i]) matchChars++;
            }
            const similarity = matchChars / Math.max(messageText.length, concatenated.length);

            if (similarity > bestSimilarity && similarity > 0.3) {
              bestSimilarity = similarity;
              // 多数決で話者を決定
              let maxV = 0;
              for (const [s, v] of Object.entries(localVotes)) {
                if (v > maxV) {
                  maxV = v;
                  bestFallbackSpeaker = parseInt(s, 10) + 1;
                }
              }
            }
          }
        }

        if (bestSimilarity > 0.3) {
          const { error: updateError } = await adminClient
            .from("talk_messages")
            .update({ speaker_tag: bestFallbackSpeaker })
            .eq("id", message.id);

          if (!updateError) {
            updatedCount++;
            console.log(`[Diarize] Fallback updated "${message.original_text.substring(0, 25)}..." → speaker${bestFallbackSpeaker} (similarity: ${bestSimilarity.toFixed(2)})`);
          }
        } else {
          console.log(`[Diarize] No match found for: "${message.original_text.substring(0, 30)}..."`);
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const talkId = id;

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

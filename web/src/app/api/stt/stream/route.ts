/**
 * SSE（Server-Sent Events）リアルタイム文字起こしAPI
 *
 * Google Cloud Speech-to-Text V2 ストリーミングを使用
 * + リアルタイム翻訳
 */

import { v2 } from "@google-cloud/speech";
import { NextRequest } from "next/server";
import { sessionStore } from "@/lib/stt/session-store";
import { createClient } from "@/lib/supabase/server";
import { translateText } from "@/lib/translate/client";
import * as fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 言語コードを変換（ja → ja-JP）
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("sessionId");
  const talkId = searchParams.get("talkId");

  console.log("[STT Stream] New connection request", { sessionId, talkId });

  if (!sessionId || !talkId) {
    return new Response("Missing sessionId or talkId", { status: 400 });
  }

  // 認証チェック
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 話者の言語とパートナーの言語を取得
  const { data: talkData, error: talkError } = await supabase
    .from("talks")
    .select("partnership_id, owner_user_id")
    .eq("id", talkId)
    .single();

  console.log("[STT Stream] Talk data", { talkData, talkError });

  let sourceLanguage = "ja";
  let targetLanguage: string | null = null;

  if (talkData?.partnership_id) {
    // 現在のユーザーの言語
    const { data: userProfile, error: userError } = await supabase
      .from("user_profiles")
      .select("language")
      .eq("id", user.id)
      .single();

    console.log("[STT Stream] User profile", { userProfile, userError });
    sourceLanguage = userProfile?.language || "ja";

    // パートナーの言語を取得
    const { data: partnership, error: partnershipError } = await supabase
      .from("partnerships")
      .select("user1_id, user2_id")
      .eq("id", talkData.partnership_id)
      .single();

    console.log("[STT Stream] Partnership", { partnership, partnershipError });

    if (partnership) {
      const partnerId = partnership.user1_id === user.id
        ? partnership.user2_id
        : partnership.user1_id;

      console.log("[STT Stream] Partner ID", { partnerId, userId: user.id });

      const { data: partnerProfile, error: partnerError } = await supabase
        .from("user_profiles")
        .select("language")
        .eq("id", partnerId)
        .single();

      console.log("[STT Stream] Partner profile", { partnerProfile, partnerError });
      targetLanguage = partnerProfile?.language || null;
    }
  } else {
    console.log("[STT Stream] No partnership_id found for this talk");
  }

  console.log("[STT Stream] Languages", { sourceLanguage, targetLanguage });

  // 認証情報の準備
  const credentialsPath = process.env.AIBOND_GCP_CREDENTIALS_PATH;
  let credentials: any = null;
  let projectId: string;

  if (credentialsPath && fs.existsSync(credentialsPath)) {
    // ローカル開発: サービスアカウントキーファイルを使用
    credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
    projectId = credentials.project_id;
    console.log("[STT Stream] Using credentials from file");
  } else {
    // Cloud Run: デフォルト認証を使用
    projectId = process.env.GOOGLE_CLOUD_PROJECT || "aibond-479715";
    console.log("[STT Stream] Using default credentials");
  }

  // SSEストリーム作成
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let isControllerClosed = false;

      const safeEnqueue = (data: Uint8Array) => {
        if (!isControllerClosed) {
          try {
            controller.enqueue(data);
          } catch (error) {
            isControllerClosed = true;
            console.error("[STT Stream] Controller enqueue error", error);
          }
        }
      };

      try {
        console.log("[STT Stream] Initializing Speech V2 client");

        // SpeechClient V2作成
        const speechClient = credentials
          ? new v2.SpeechClient({
              credentials,
              apiEndpoint: "asia-northeast1-speech.googleapis.com",
            })
          : new v2.SpeechClient({
              apiEndpoint: "asia-northeast1-speech.googleapis.com",
            });

        // Recognizer設定（asia-northeast1でChirp 3が利用可能）
        const recognizerPath = `projects/${projectId}/locations/asia-northeast1/recognizers/_`;

        // V2 RecognitionConfig
        const recognitionConfig = {
          explicitDecodingConfig: {
            encoding: "LINEAR16" as const,
            sampleRateHertz: 16000,
            audioChannelCount: 1,
          },
          languageCodes: [convertLanguageCode(sourceLanguage)],
          model: "long", // リアルタイム用（話者識別は後でBatchRecognizeで実行）
          features: {
            enableAutomaticPunctuation: true,
            // diarizationConfigはStreamingRecognizeで日本語未対応のため削除
          },
        };

        // V2 StreamingRecognitionConfig
        const streamingConfig = {
          config: recognitionConfig,
          streamingFeatures: {
            interimResults: true, // 中間結果を有効化（リアルタイム）
          },
        };

        // 初期リクエスト
        const configRequest = {
          recognizer: recognizerPath,
          streamingConfig: streamingConfig,
        };

        console.log("[STT Stream] Creating streaming recognize request");

        // V2ストリーム作成
        const sttStream = speechClient._streamingRecognize();

        // 最初にconfigを送信
        sttStream.write(configRequest);

        console.log("[STT Stream] STT stream created");

        // セッション登録
        sessionStore.set(sessionId, {
          sttStream,
          controller,
          talkId,
          createdAt: new Date(),
        });

        // クライアントへ初期化完了通知
        safeEnqueue(encoder.encode("event: ready\ndata: {}\n\n"));

        // STT結果をSSEで送信
        sttStream.on("data", async (data: any) => {
          try {
            const result = data.results?.[0];

            if (!result) return;

            const event = result.isFinal ? "final" : "partial";
            const alternative = result.alternatives?.[0];
            const transcript = alternative?.transcript || "";
            const confidence = alternative?.confidence || 0;

            if (!transcript) return;

            console.log(`[STT Stream] ${event}:`, transcript.substring(0, 50));

            // Final結果の場合、翻訳を実行
            let translatedText: string | null = null;
            if (result.isFinal && targetLanguage && sourceLanguage !== targetLanguage) {
              try {
                translatedText = await translateText(transcript, sourceLanguage, targetLanguage);
                if (translatedText) {
                  console.log(`[STT Stream] Translated:`, translatedText.substring(0, 50));
                }
              } catch (translateError) {
                console.error("[STT Stream] Translation error:", translateError);
              }
            }

            const sseData = `event: ${event}\ndata: ${JSON.stringify({
              id: `transcript-${Date.now()}`,
              text: transcript,
              translatedText: translatedText,
              confidence: confidence,
              timestamp: new Date().toISOString(),
              isFinal: result.isFinal,
            })}\n\n`;

            safeEnqueue(encoder.encode(sseData));

            // Final結果の場合、DBに保存（話者タグはnull、後でBatchRecognizeで更新）
            if (result.isFinal && transcript.trim()) {
              try {
                const { error: insertError } = await supabase
                  .from("talk_messages")
                  .insert({
                    talk_id: talkId,
                    speaker_tag: null, // 後でBatchRecognizeで更新
                    original_text: transcript,
                    original_language: sourceLanguage,
                    translated_text: translatedText,
                    is_final: true,
                  });

                if (insertError) {
                  console.error("[STT Stream] Failed to save transcript:", insertError);
                }
              } catch (dbError) {
                console.error("[STT Stream] DB error:", dbError);
              }
            }
          } catch (error) {
            console.error("[STT Stream] Error processing data", error);
          }
        });

        // エラーハンドリング
        sttStream.on("error", (error: any) => {
          const errorCode = error.code;
          const errorMessage = error.message || "STT stream error";

          console.error("[STT Stream] STT stream error", {
            message: errorMessage,
            code: errorCode,
            sessionId,
          });

          // タイムアウトエラー（ABORTED）の場合は警告レベルで処理
          // 録音終了処理は続行されるので、致命的なエラーではない
          if (errorCode === 10 || errorMessage.includes("timed out")) {
            console.log("[STT Stream] Stream timed out - this is expected if recording was stopped");
            // タイムアウトは致命的ではないので、エラーイベントを送らない
            // 録音終了処理が別途実行される
            return;
          }

          const errorData = `event: error\ndata: ${JSON.stringify({
            message: errorMessage,
            code: errorCode,
          })}\n\n`;

          safeEnqueue(encoder.encode(errorData));
        });

        sttStream.on("end", () => {
          console.log("[STT Stream] STT stream ended gracefully", { sessionId });
          // セッションをクリーンアップ
          sessionStore.delete(sessionId);
        });

        // ハートビート（30秒ごと）
        const heartbeat = setInterval(() => {
          safeEnqueue(encoder.encode("event: ping\ndata: {}\n\n"));
          if (isControllerClosed) {
            clearInterval(heartbeat);
          }
        }, 30000);

        // クリーンアップ
        request.signal.addEventListener("abort", () => {
          console.log("[STT Stream] Client disconnected", { sessionId });

          isControllerClosed = true;
          clearInterval(heartbeat);

          try {
            sttStream.end();
          } catch (error) {
            console.error("[STT Stream] Error ending stream", error);
          }

          sessionStore.delete(sessionId);

          try {
            controller.close();
          } catch (error) {
            console.error("[STT Stream] Error closing controller", error);
          }
        });
      } catch (error) {
        console.error("[STT Stream] Initialization error", error);

        const errorData = `event: error\ndata: ${JSON.stringify({
          message: error instanceof Error ? error.message : "Initialization failed",
        })}\n\n`;

        safeEnqueue(encoder.encode(errorData));
        isControllerClosed = true;
        try {
          controller.close();
        } catch (closeError) {
          console.error("[STT Stream] Error closing controller", closeError);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

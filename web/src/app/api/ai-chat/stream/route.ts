/**
 * AI相談チャット ストリーミングAPI
 *
 * POST /api/ai-chat/stream - メッセージ送信（ストリーミングレスポンス）
 */

import { createClient } from "@/lib/supabase/server";
import { generateAIChatResponseStream } from "@/lib/gemini/client";
import { NextRequest } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// プランチェック用ヘルパー関数
async function checkPaidPlan(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .single();

  const plan = subscription?.plan || "free";
  return plan !== "free"; // standard または premium は有料
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 有料プランチェック
  const isPaidUser = await checkPaidPlan(supabase, user.id);
  if (!isPaidUser) {
    return new Response(
      JSON.stringify({ error: "AI相談は有料プラン限定の機能です", code: "PLAN_REQUIRED" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await request.json();
    const { consultation_id, message } = body;

    if (!message || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let consultation;
    let chatHistory: ChatMessage[] = [];

    // 既存の相談に追加 or 新規作成（削除済みを除外）
    if (consultation_id) {
      const { data, error } = await supabase
        .from("ai_consultations")
        .select("*")
        .eq("id", consultation_id)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Consultation not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      consultation = data;
      chatHistory = (data.chat_history as ChatMessage[]) || [];
    }

    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      role: "user",
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };
    chatHistory.push(userMessage);

    // 直近のトークサマリーを取得（コンテキスト用）
    const { data: recentTalks } = await supabase
      .from("talks")
      .select("summary")
      .eq("owner_user_id", user.id)
      .eq("summary_status", "generated")
      .not("summary", "is", null)
      .order("ended_at", { ascending: false })
      .limit(5);

    const recentSummaries = (recentTalks || [])
      .map((t) => t.summary)
      .filter((s): s is string => !!s);

    // 自分の取説を取得
    const { data: userManualItems } = await supabase
      .from("manual_items")
      .select("question, answer, category")
      .eq("user_id", user.id)
      .eq("target_user_id", user.id);

    // パートナーの取説を取得（パートナーがいる場合、削除済みを除外）
    let partnerManualItems: Array<{ question: string; answer: string; category: string }> = [];
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "active")
      .is("history_deleted_at", null)
      .single();

    if (partnership) {
      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      const { data: partnerItems } = await supabase
        .from("manual_items")
        .select("question, answer, category")
        .eq("user_id", user.id)
        .eq("target_user_id", partnerId);

      partnerManualItems = partnerItems || [];
    }

    console.log("[AI Chat Stream] Generating response with", recentSummaries.length, "summaries,", userManualItems?.length || 0, "user manual items, and", partnerManualItems.length, "partner manual items");

    // タイトルを生成（最初のメッセージから）
    const title =
      chatHistory.length <= 1
        ? message.trim().substring(0, 50) + (message.length > 50 ? "..." : "")
        : undefined;

    // 新規の場合、先に相談レコードを作成
    let consultationId = consultation?.id;
    if (!consultation) {
      const { data: newConsultation, error: insertError } = await supabase
        .from("ai_consultations")
        .insert({
          user_id: user.id,
          title: title,
          chat_history: chatHistory,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[AI Chat Stream] Error creating consultation:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save consultation" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      consultationId = newConsultation.id;
    }

    // ストリーミングレスポンスを生成
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // consultation_idを最初に送信
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "start", consultation_id: consultationId })}\n\n`)
          );

          // ストリーミング生成
          const generator = generateAIChatResponseStream(
            message.trim(),
            chatHistory.slice(0, -1), // 最新のユーザーメッセージを除く履歴
            recentSummaries,
            userManualItems || [],
            partnerManualItems
          );

          for await (const chunk of generator) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`)
            );
          }

          // AI応答を追加してDBに保存
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: fullResponse,
            timestamp: new Date().toISOString(),
          };
          chatHistory.push(assistantMessage);

          // 相談を更新
          const { error: updateError } = await supabase
            .from("ai_consultations")
            .update({
              chat_history: chatHistory,
              updated_at: new Date().toISOString(),
            })
            .eq("id", consultationId);

          if (updateError) {
            console.error("[AI Chat Stream] Error updating consultation:", updateError);
          }

          // 完了を通知
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", timestamp: assistantMessage.timestamp })}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error("[AI Chat Stream] Error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "AI応答の生成に失敗しました" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Chat Stream] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

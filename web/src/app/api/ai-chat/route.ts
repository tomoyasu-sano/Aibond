/**
 * AI相談チャットAPI
 *
 * GET /api/ai-chat - 相談一覧取得
 * POST /api/ai-chat - 新規相談作成 or メッセージ送信
 */

import { createClient } from "@/lib/supabase/server";
import { generateAIChatResponse } from "@/lib/gemini/client";
import { NextRequest, NextResponse } from "next/server";

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

// GET - 相談一覧取得
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 有料プランチェック
  const isPaidUser = await checkPaidPlan(supabase, user.id);
  if (!isPaidUser) {
    return NextResponse.json(
      { error: "AI相談は有料プラン限定の機能です", code: "PLAN_REQUIRED" },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const consultationId = searchParams.get("id");

  // 特定の相談を取得（削除済みを除外）
  if (consultationId) {
    const { data: consultation, error } = await supabase
      .from("ai_consultations")
      .select("*")
      .eq("id", consultationId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error || !consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ consultation });
  }

  // 一覧取得（削除済みを除外）
  const { data: consultations, error } = await supabase
    .from("ai_consultations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[AI Chat] Error fetching consultations:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ consultations: consultations || [] });
}

// POST - 新規相談作成 or メッセージ送信
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 有料プランチェック
  const isPaidUser = await checkPaidPlan(supabase, user.id);
  if (!isPaidUser) {
    return NextResponse.json(
      { error: "AI相談は有料プラン限定の機能です", code: "PLAN_REQUIRED" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { consultation_id, message } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: "Consultation not found" },
          { status: 404 }
        );
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

    console.log("[AI Chat] Generating response with", recentSummaries.length, "summaries as context");

    // AI応答を生成
    const aiResponse = await generateAIChatResponse(
      message.trim(),
      chatHistory.slice(0, -1), // 最新のユーザーメッセージを除く履歴
      recentSummaries
    );

    // AI応答を追加
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: aiResponse,
      timestamp: new Date().toISOString(),
    };
    chatHistory.push(assistantMessage);

    // タイトルを生成（最初のメッセージから）
    const title =
      chatHistory.length <= 2
        ? message.trim().substring(0, 50) + (message.length > 50 ? "..." : "")
        : undefined;

    // 相談を保存/更新
    if (consultation) {
      const { error: updateError } = await supabase
        .from("ai_consultations")
        .update({
          chat_history: chatHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", consultation.id);

      if (updateError) {
        console.error("[AI Chat] Error updating consultation:", updateError);
      }

      return NextResponse.json({
        consultation_id: consultation.id,
        message: assistantMessage,
      });
    } else {
      // 新規作成
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
        console.error("[AI Chat] Error creating consultation:", insertError);
        return NextResponse.json(
          { error: "Failed to save consultation" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        consultation_id: newConsultation.id,
        message: assistantMessage,
      });
    }
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

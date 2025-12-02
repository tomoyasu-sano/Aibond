/**
 * フィードバック送信API
 *
 * POST /api/feedback - フィードバックを保存
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Rating = "love" | "good" | "neutral" | "bad" | "terrible";
type Category = "idea" | "bug" | "question" | "praise";

interface FeedbackBody {
  rating?: Rating;
  category?: Category | null;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー情報を取得（オプション - ログインしていなくても送信可能）
    const { data: { user } } = await supabase.auth.getUser();

    const body: FeedbackBody = await request.json();
    const { rating, category, message } = body;

    // メッセージが空の場合はエラー
    if (!message?.trim() && !rating) {
      return NextResponse.json(
        { error: "Message or rating is required" },
        { status: 400 }
      );
    }

    // フィードバックをデータベースに保存
    const { error } = await supabase
      .from("feedbacks")
      .insert({
        user_id: user?.id || null,
        user_email: user?.email || null,
        rating: rating || null,
        category: category || null,
        message: message || null,
        page_url: request.headers.get("referer") || null,
        user_agent: request.headers.get("user-agent") || null,
      });

    if (error) {
      // テーブルが存在しない場合はログだけ出力して成功を返す
      // （本番環境ではテーブルを作成する）
      console.log("[Feedback] Database error (table may not exist):", error.message);
      console.log("[Feedback] Received:", {
        user_id: user?.id,
        user_email: user?.email,
        rating,
        category,
        message: message?.substring(0, 100),
      });

      // 開発中はエラーでも成功として返す
      return NextResponse.json({ success: true, stored: false });
    }

    console.log("[Feedback] Saved successfully:", {
      user_id: user?.id,
      rating,
      category,
    });

    return NextResponse.json({ success: true, stored: true });
  } catch (error) {
    console.error("[Feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

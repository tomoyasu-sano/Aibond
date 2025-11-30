/**
 * 絆ノート - 評価API
 *
 * POST /api/kizuna/feedbacks - 評価追加
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - 評価追加
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { item_id, rating, comment } = body;

    // バリデーション
    if (!item_id) {
      return NextResponse.json({ error: "item_id is required" }, { status: 400 });
    }

    if (!rating || !["good", "neutral", "bad"].includes(rating)) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    // 評価を作成
    const { data: feedback, error } = await supabase
      .from("kizuna_feedbacks")
      .insert({
        item_id,
        user_id: user.id,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Kizuna Feedbacks] Error creating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // テーマのupdated_atを更新
    const { data: item } = await supabase
      .from("kizuna_items")
      .select("topic_id")
      .eq("id", item_id)
      .single();

    if (item) {
      await supabase
        .from("kizuna_topics")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", item.topic_id);
    }

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error("[Kizuna Feedbacks] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

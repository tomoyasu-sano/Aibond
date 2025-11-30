/**
 * 絆ノート - 項目API
 *
 * POST /api/kizuna/items - 項目作成
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - 項目作成
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
    const { topic_id, type, content, assignee, review_date, review_period } = body;

    // バリデーション
    if (!topic_id) {
      return NextResponse.json({ error: "topic_id is required" }, { status: 400 });
    }

    if (!type || !["promise", "request", "my_feeling", "partner_feeling", "memo"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    // 約束・要望の場合はassigneeが必要
    if ((type === "promise" || type === "request") && assignee) {
      if (!["self", "partner", "both"].includes(assignee)) {
        return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
      }
    }

    // 項目を作成
    const { data: item, error } = await supabase
      .from("kizuna_items")
      .insert({
        topic_id,
        type,
        content: content.trim(),
        assignee: (type === "promise" || type === "request") ? (assignee || "self") : null,
        review_date: review_date || null,
        review_period: review_period || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[Kizuna Items] Error creating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // テーマのupdated_atを更新
    await supabase
      .from("kizuna_topics")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", topic_id);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[Kizuna Items] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

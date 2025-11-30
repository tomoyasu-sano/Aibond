/**
 * 絆ノート - テーマ詳細API
 *
 * GET /api/kizuna/topics/[id] - テーマ詳細取得（項目含む）
 * PATCH /api/kizuna/topics/[id] - テーマ更新
 * DELETE /api/kizuna/topics/[id] - テーマ削除
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET - テーマ詳細取得（項目・評価含む）
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // テーマを取得
  const { data: topic, error: topicError } = await supabase
    .from("kizuna_topics")
    .select("*")
    .eq("id", id)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  // 項目を取得（評価付き）
  const { data: items, error: itemsError } = await supabase
    .from("kizuna_items")
    .select(
      `
      *,
      feedbacks:kizuna_feedbacks(id, user_id, rating, comment, created_at),
      reviews:kizuna_reviews(id, result, note, created_by, created_at)
    `
    )
    .eq("topic_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("[Kizuna Topic Detail] Error fetching items:", itemsError);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({
    topic,
    items: items || [],
  });
}

// PATCH - テーマ更新
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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
    const { title, status } = body;

    const updateData: { title?: string; status?: string; resolved_at?: string | null } = {};

    if (title !== undefined) {
      if (title.trim().length === 0) {
        return NextResponse.json(
          { error: "title cannot be empty" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (status !== undefined) {
      if (!["active", "resolved"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      updateData.status = status;
      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      } else {
        updateData.resolved_at = null;
      }
    }

    const { data: topic, error } = await supabase
      .from("kizuna_topics")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Kizuna Topics] Error updating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ topic });
  } catch (error) {
    console.error("[Kizuna Topics] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - テーマ削除
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("kizuna_topics")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Kizuna Topics] Error deleting:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

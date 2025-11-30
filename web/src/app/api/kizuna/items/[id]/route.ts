/**
 * 絆ノート - 項目詳細API
 *
 * PATCH /api/kizuna/items/[id] - 項目更新
 * DELETE /api/kizuna/items/[id] - 項目削除
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH - 項目更新
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
    const { content, assignee, review_date, review_period, status } = body;

    const updateData: {
      content?: string;
      assignee?: string;
      review_date?: string | null;
      review_period?: string | null;
      status?: string;
    } = {};

    if (content !== undefined) {
      if (content.trim().length === 0) {
        return NextResponse.json(
          { error: "content cannot be empty" },
          { status: 400 }
        );
      }
      updateData.content = content.trim();
    }

    if (assignee !== undefined) {
      if (!["self", "partner", "both"].includes(assignee)) {
        return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
      }
      updateData.assignee = assignee;
    }

    if (review_date !== undefined) {
      updateData.review_date = review_date;
    }

    if (review_period !== undefined) {
      updateData.review_period = review_period;
    }

    if (status !== undefined) {
      if (!["active", "completed", "modified", "abandoned"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
    }

    const { data: item, error } = await supabase
      .from("kizuna_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Kizuna Items] Error updating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // テーマのupdated_atを更新
    if (item) {
      await supabase
        .from("kizuna_topics")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", item.topic_id);
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[Kizuna Items] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - 項目削除
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

  // 先にtopic_idを取得
  const { data: item } = await supabase
    .from("kizuna_items")
    .select("topic_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("kizuna_items")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Kizuna Items] Error deleting:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // テーマのupdated_atを更新
  if (item) {
    await supabase
      .from("kizuna_topics")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", item.topic_id);
  }

  return NextResponse.json({ success: true });
}

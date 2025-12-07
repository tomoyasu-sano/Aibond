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

  // テーマを取得（パートナーシップ情報含む、LEFT JOINでpartnership_id NULLにも対応）
  // 論理削除されたテーマは取得しない
  const { data: topic, error: topicError } = await supabase
    .from("kizuna_topics")
    .select("*, partnership:partnerships(id, status, history_deleted_at)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  // パートナーシップなしの場合は、作成者のみアクセス可
  if (!topic.partnership_id && topic.created_by !== user.id) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  // history_deleted_at が設定されていて、トピックがそれより前に作成された場合は非表示
  if (topic.partnership?.history_deleted_at) {
    const historyDeletedAt = new Date(topic.partnership.history_deleted_at);
    const topicCreatedAt = new Date(topic.created_at);
    if (topicCreatedAt <= historyDeletedAt) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }
  }

  // 現在ユーザーにアクティブなパートナーシップがあるか確認
  const { data: activePartnership } = await supabase
    .from("partnerships")
    .select("id, history_deleted_at")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  const hasActivePartnership = !!activePartnership;

  // 親カード（promise, request, discussion）を取得
  const { data: parentItems, error: parentError } = await supabase
    .from("kizuna_items")
    .select(
      `
      *,
      feedbacks:kizuna_feedbacks(id, user_id, rating, comment, created_at),
      reviews:kizuna_reviews(id, result, note, created_by, created_at)
    `
    )
    .eq("topic_id", id)
    .in("type", ["promise", "request", "discussion"])
    .is("parent_item_id", null)
    .order("created_at", { ascending: false });

  if (parentError) {
    console.error("[Kizuna Topic Detail] Error fetching parent items:", parentError);
    return NextResponse.json({ error: parentError.message }, { status: 500 });
  }

  // 子カード（my_feeling, partner_feeling, memo）を取得
  const { data: childItems, error: childError } = await supabase
    .from("kizuna_items")
    .select("*")
    .eq("topic_id", id)
    .in("type", ["my_feeling", "partner_feeling", "memo"])
    .not("parent_item_id", "is", null)
    .order("created_at", { ascending: true });

  if (childError) {
    console.error("[Kizuna Topic Detail] Error fetching child items:", childError);
    return NextResponse.json({ error: childError.message }, { status: 500 });
  }

  // 親カードに子カードを紐付け
  const itemsWithChildren = (parentItems || []).map((parent) => ({
    ...parent,
    children: (childItems || []).filter((child) => child.parent_item_id === parent.id),
  }));

  // 親カードに紐付いていない子カード（未分類）
  const orphanChildren = (childItems || []).filter(
    (child) => !parentItems?.some((parent) => parent.id === child.parent_item_id)
  );

  // 旧形式との互換性のため、フラットなitemsも返す
  const allItems = [
    ...(parentItems || []),
    ...(childItems || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({
    topic,
    items: allItems, // 旧形式（フラット）
    parentItems: itemsWithChildren, // 新形式（親子構造）
    orphanChildren, // 未分類の子カード
    hasActivePartnership, // 現在アクティブなパートナーシップがあるか
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

// DELETE - テーマ削除（論理削除）
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

  // 論理削除（deleted_atを設定）
  const { error } = await supabase
    .from("kizuna_topics")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    console.error("[Kizuna Topics] Error deleting:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

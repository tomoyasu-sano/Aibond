/**
 * 絆ノート - テーマAPI
 *
 * GET /api/kizuna/topics - テーマ一覧取得
 * POST /api/kizuna/topics - テーマ作成
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - テーマ一覧取得
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // クエリパラメータ
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status"); // 'active' | 'resolved' | null(all)

  // ユーザーのパートナーシップを取得
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  if (!partnership) {
    return NextResponse.json({ topics: [], total: 0 });
  }

  // クエリ構築
  let query = supabase
    .from("kizuna_topics")
    .select(
      `
      *,
      items:kizuna_items(count),
      active_items:kizuna_items(id, review_date, status),
      latest_feedback:kizuna_items(
        kizuna_feedbacks(rating, created_at)
      )
    `,
      { count: "exact" }
    )
    .eq("partnership_id", partnership.id)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: topics, error, count } = await query;

  if (error) {
    console.error("[Kizuna Topics] Error fetching:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];

  // レスポンス整形
  const formattedTopics = (topics || []).map((topic) => {
    // 最新の評価を取得
    let latestRating = null;
    if (topic.latest_feedback) {
      const allFeedbacks = topic.latest_feedback
        .flatMap((item: { kizuna_feedbacks: { rating: string; created_at: string }[] }) =>
          item.kizuna_feedbacks || []
        )
        .sort((a: { created_at: string }, b: { created_at: string }) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      latestRating = allFeedbacks[0]?.rating || null;
    }

    // レビュー待ちの数を計算
    const reviewDueCount = (topic.active_items || []).filter(
      (item: { status: string; review_date: string | null }) =>
        item.status === "active" && item.review_date && item.review_date <= today
    ).length;

    return {
      id: topic.id,
      title: topic.title,
      status: topic.status,
      created_at: topic.created_at,
      updated_at: topic.updated_at,
      resolved_at: topic.resolved_at,
      item_count: topic.items?.[0]?.count || 0,
      latest_rating: latestRating,
      review_due_count: reviewDueCount,
    };
  });

  return NextResponse.json({
    topics: formattedTopics,
    total: count || 0,
  });
}

// POST - テーマ作成
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
    const { title } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    // ユーザーのパートナーシップを取得
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "active")
      .single();

    if (!partnership) {
      return NextResponse.json(
        { error: "Partnership not found" },
        { status: 400 }
      );
    }

    // テーマを作成
    const { data: topic, error } = await supabase
      .from("kizuna_topics")
      .insert({
        partnership_id: partnership.id,
        title: title.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[Kizuna Topics] Error creating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    console.error("[Kizuna Topics] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

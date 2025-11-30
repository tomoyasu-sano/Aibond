/**
 * 絆ノート - 履歴API
 *
 * GET /api/kizuna/history - 履歴取得
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - 履歴取得
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // パートナーシップを取得
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "active")
      .single();

    if (!partnership) {
      return NextResponse.json({
        reviews: [],
        feedbacks: [],
        stats: {
          total_topics: 0,
          resolved_topics: 0,
          completed_promises: 0,
          total_feedbacks: 0,
        },
      });
    }

    // レビュー履歴を取得
    const { data: reviews } = await supabase
      .from("kizuna_reviews")
      .select(`
        id,
        result,
        note,
        created_at,
        kizuna_items!inner (
          id,
          content,
          type,
          kizuna_topics!inner (
            id,
            title,
            partnership_id
          )
        )
      `)
      .eq("kizuna_items.kizuna_topics.partnership_id", partnership.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // フィードバック履歴を取得
    const { data: feedbacks } = await supabase
      .from("kizuna_feedbacks")
      .select(`
        id,
        rating,
        comment,
        created_at,
        user_id,
        kizuna_items!inner (
          id,
          content,
          type,
          kizuna_topics!inner (
            id,
            title,
            partnership_id
          )
        )
      `)
      .eq("kizuna_items.kizuna_topics.partnership_id", partnership.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // 統計を取得
    const { count: totalTopics } = await supabase
      .from("kizuna_topics")
      .select("*", { count: "exact", head: true })
      .eq("partnership_id", partnership.id);

    const { count: resolvedTopics } = await supabase
      .from("kizuna_topics")
      .select("*", { count: "exact", head: true })
      .eq("partnership_id", partnership.id)
      .eq("status", "resolved");

    const { count: completedPromises } = await supabase
      .from("kizuna_items")
      .select("*, kizuna_topics!inner(*)", { count: "exact", head: true })
      .eq("kizuna_topics.partnership_id", partnership.id)
      .eq("type", "promise")
      .eq("status", "completed");

    const { count: totalFeedbacks } = await supabase
      .from("kizuna_feedbacks")
      .select("*, kizuna_items!inner(*, kizuna_topics!inner(*))", { count: "exact", head: true })
      .eq("kizuna_items.kizuna_topics.partnership_id", partnership.id);

    // レビュー結果の内訳
    const { data: reviewStats } = await supabase
      .from("kizuna_reviews")
      .select(`
        result,
        kizuna_items!inner (
          kizuna_topics!inner (
            partnership_id
          )
        )
      `)
      .eq("kizuna_items.kizuna_topics.partnership_id", partnership.id);

    const reviewBreakdown = {
      completed: 0,
      continue: 0,
      modified: 0,
      abandoned: 0,
    };

    reviewStats?.forEach((r) => {
      if (r.result in reviewBreakdown) {
        reviewBreakdown[r.result as keyof typeof reviewBreakdown]++;
      }
    });

    return NextResponse.json({
      reviews: reviews || [],
      feedbacks: feedbacks || [],
      stats: {
        total_topics: totalTopics || 0,
        resolved_topics: resolvedTopics || 0,
        completed_promises: completedPromises || 0,
        total_feedbacks: totalFeedbacks || 0,
        review_breakdown: reviewBreakdown,
      },
    });
  } catch (error) {
    console.error("[Kizuna History] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

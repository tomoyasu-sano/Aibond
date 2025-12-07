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
    // パートナーシップを取得（history_deleted_at が設定されていても取得）
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("id, history_deleted_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "active")
      .single();

    const historyDeletedAt = partnership?.history_deleted_at;

    // レビュー履歴を取得（論理削除されたトピックは除外）
    let reviewsQuery = supabase
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
            partnership_id,
            created_by,
            deleted_at,
            created_at
          )
        )
      `)
      .is("kizuna_items.kizuna_topics.deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (partnership) {
      reviewsQuery = reviewsQuery.eq("kizuna_items.kizuna_topics.partnership_id", partnership.id);
      if (historyDeletedAt) {
        reviewsQuery = reviewsQuery.gt("kizuna_items.kizuna_topics.created_at", historyDeletedAt);
      }
    } else {
      reviewsQuery = reviewsQuery
        .is("kizuna_items.kizuna_topics.partnership_id", null)
        .eq("kizuna_items.kizuna_topics.created_by", user.id);
    }

    const { data: reviews } = await reviewsQuery;

    // フィードバック履歴を取得（論理削除されたトピックは除外）
    let feedbacksQuery = supabase
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
            partnership_id,
            created_by,
            deleted_at,
            created_at
          )
        )
      `)
      .is("kizuna_items.kizuna_topics.deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (partnership) {
      feedbacksQuery = feedbacksQuery.eq("kizuna_items.kizuna_topics.partnership_id", partnership.id);
      if (historyDeletedAt) {
        feedbacksQuery = feedbacksQuery.gt("kizuna_items.kizuna_topics.created_at", historyDeletedAt);
      }
    } else {
      feedbacksQuery = feedbacksQuery
        .is("kizuna_items.kizuna_topics.partnership_id", null)
        .eq("kizuna_items.kizuna_topics.created_by", user.id);
    }

    const { data: feedbacks } = await feedbacksQuery;

    // 統計を取得（論理削除されたトピックは除外）
    let totalTopicsQuery = supabase
      .from("kizuna_topics")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    let resolvedTopicsQuery = supabase
      .from("kizuna_topics")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved")
      .is("deleted_at", null);

    let completedPromisesQuery = supabase
      .from("kizuna_items")
      .select("*, kizuna_topics!inner(deleted_at, created_at)", { count: "exact", head: true })
      .eq("type", "promise")
      .eq("status", "completed")
      .is("kizuna_topics.deleted_at", null);

    let totalFeedbacksQuery = supabase
      .from("kizuna_feedbacks")
      .select("*, kizuna_items!inner(*, kizuna_topics!inner(deleted_at, created_at))", { count: "exact", head: true })
      .is("kizuna_items.kizuna_topics.deleted_at", null);

    let reviewStatsQuery = supabase
      .from("kizuna_reviews")
      .select(`
        result,
        kizuna_items!inner (
          kizuna_topics!inner (
            partnership_id,
            created_by,
            deleted_at,
            created_at
          )
        )
      `)
      .is("kizuna_items.kizuna_topics.deleted_at", null);

    if (partnership) {
      totalTopicsQuery = totalTopicsQuery.eq("partnership_id", partnership.id);
      resolvedTopicsQuery = resolvedTopicsQuery.eq("partnership_id", partnership.id);
      completedPromisesQuery = completedPromisesQuery.eq("kizuna_topics.partnership_id", partnership.id);
      totalFeedbacksQuery = totalFeedbacksQuery.eq("kizuna_items.kizuna_topics.partnership_id", partnership.id);
      reviewStatsQuery = reviewStatsQuery.eq("kizuna_items.kizuna_topics.partnership_id", partnership.id);

      if (historyDeletedAt) {
        totalTopicsQuery = totalTopicsQuery.gt("created_at", historyDeletedAt);
        resolvedTopicsQuery = resolvedTopicsQuery.gt("created_at", historyDeletedAt);
        completedPromisesQuery = completedPromisesQuery.gt("kizuna_topics.created_at", historyDeletedAt);
        totalFeedbacksQuery = totalFeedbacksQuery.gt("kizuna_items.kizuna_topics.created_at", historyDeletedAt);
        reviewStatsQuery = reviewStatsQuery.gt("kizuna_items.kizuna_topics.created_at", historyDeletedAt);
      }
    } else {
      totalTopicsQuery = totalTopicsQuery.is("partnership_id", null).eq("created_by", user.id);
      resolvedTopicsQuery = resolvedTopicsQuery.is("partnership_id", null).eq("created_by", user.id);
      completedPromisesQuery = completedPromisesQuery.is("kizuna_topics.partnership_id", null).eq("kizuna_topics.created_by", user.id);
      totalFeedbacksQuery = totalFeedbacksQuery.is("kizuna_items.kizuna_topics.partnership_id", null).eq("kizuna_items.kizuna_topics.created_by", user.id);
      reviewStatsQuery = reviewStatsQuery.is("kizuna_items.kizuna_topics.partnership_id", null).eq("kizuna_items.kizuna_topics.created_by", user.id);
    }

    const [
      { count: totalTopics },
      { count: resolvedTopics },
      { count: completedPromises },
      { count: totalFeedbacks },
      { data: reviewStats },
    ] = await Promise.all([
      totalTopicsQuery,
      resolvedTopicsQuery,
      completedPromisesQuery,
      totalFeedbacksQuery,
      reviewStatsQuery,
    ]);

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

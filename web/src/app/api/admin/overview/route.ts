/**
 * Admin Overview Stats API
 * GET /api/admin/overview - Get overview statistics
 */

import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // 並行してデータを取得
    const [
      usersResult,
      talksResult,
      subscriptionsResult,
      feedbacksResult,
      recentUsersResult,
      recentTalksResult,
    ] = await Promise.all([
      // 総ユーザー数
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      // 総会話数
      supabase.from("talks").select("id", { count: "exact", head: true }),
      // アクティブなサブスク数
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      // フィードバック数
      supabase.from("feedbacks").select("id", { count: "exact", head: true }),
      // 過去7日間の新規ユーザー
      supabase.from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      // 過去7日間の会話数
      supabase.from("talks")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // 総利用時間（分）を計算
    const { data: usageData } = await supabase
      .from("talks")
      .select("duration_seconds");

    const totalMinutes = usageData?.reduce((acc, talk) => {
      return acc + (talk.duration_seconds || 0) / 60;
    }, 0) || 0;

    // MRR計算（プラン別の価格）
    const { data: activeSubscriptions } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("status", "active");

    const planPrices: Record<string, number> = {
      standard: 980,
      premium: 1980,
    };

    const mrr = activeSubscriptions?.reduce((acc, sub) => {
      return acc + (planPrices[sub.plan] || 0);
    }, 0) || 0;

    return NextResponse.json({
      totalUsers: usersResult.count || 0,
      totalTalks: talksResult.count || 0,
      activeSubscriptions: subscriptionsResult.count || 0,
      totalFeedbacks: feedbacksResult.count || 0,
      newUsersLast7Days: recentUsersResult.count || 0,
      talksLast7Days: recentTalksResult.count || 0,
      totalMinutes: Math.round(totalMinutes),
      mrr,
    });
  } catch (error) {
    console.error("[Admin Overview] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch overview stats" },
      { status: 500 }
    );
  }
}

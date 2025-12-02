/**
 * Admin Revenue API
 * GET /api/admin/revenue - Get revenue and subscription statistics
 */

import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

// プラン価格
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  standard: 980,
  premium: 1980,
};

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "90"; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // 全サブスクリプションを取得
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan, status, created_at, current_period_end, cancel_at");

    // プラン別ユーザー数（アクティブのみ）
    const planBreakdown: Record<string, number> = {
      free: 0,
      standard: 0,
      premium: 0,
    };

    subscriptions?.forEach((sub) => {
      if (sub.status === "active") {
        planBreakdown[sub.plan] = (planBreakdown[sub.plan] || 0) + 1;
      }
    });

    // Freeユーザー数を計算（サブスクがないユーザー）
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const paidUsers = (planBreakdown.standard || 0) + (planBreakdown.premium || 0);
    planBreakdown.free = (totalUsers || 0) - paidUsers;

    // MRR計算
    const mrr = Object.entries(planBreakdown).reduce((acc, [plan, count]) => {
      return acc + (PLAN_PRICES[plan] || 0) * count;
    }, 0);

    // ARR計算
    const arr = mrr * 12;

    // 月別のMRR推移を計算
    const monthlyMRR: Record<string, number> = {};

    // 過去のサブスクリプション履歴から月別MRRを計算
    // 簡易版: 現在のアクティブサブスクから逆算
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      // その月に作成されたアクティブなサブスクをカウント
      const subsInMonth = subscriptions?.filter((sub) => {
        const createdAt = new Date(sub.created_at);
        return createdAt <= new Date(date.getFullYear(), date.getMonth() + 1, 0) &&
          (sub.status === "active" || (sub.cancel_at && new Date(sub.cancel_at) >= date));
      }) || [];

      const monthMRR = subsInMonth.reduce((acc, sub) => {
        return acc + (PLAN_PRICES[sub.plan] || 0);
      }, 0);

      monthlyMRR[monthKey] = monthMRR;
    }

    // 時系列データに変換（古い順）
    const mrrTimeSeries = Object.entries(monthlyMRR)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, mrr: value }));

    // キャンセル予定数
    const cancelScheduled = subscriptions?.filter(
      (sub) => sub.cancel_at && sub.status === "active"
    ).length || 0;

    // 有料転換率
    const conversionRate = totalUsers && totalUsers > 0
      ? Math.round((paidUsers / totalUsers) * 1000) / 10
      : 0;

    // ARPU（有料ユーザーのみ）
    const arpu = paidUsers > 0 ? Math.round(mrr / paidUsers) : 0;

    return NextResponse.json({
      mrr,
      arr,
      planBreakdown,
      totalUsers: totalUsers || 0,
      paidUsers,
      conversionRate,
      arpu,
      cancelScheduled,
      mrrTimeSeries,
    });
  } catch (error) {
    console.error("[Admin Revenue] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue stats" },
      { status: 500 }
    );
  }
}

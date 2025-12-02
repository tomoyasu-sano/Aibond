/**
 * Admin Talks API
 * GET /api/admin/talks - Get conversation statistics
 */

import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "30"; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // 全会話を取得
    const { data: talks } = await supabase
      .from("talks")
      .select("id, status, duration_seconds, created_at")
      .gte("created_at", startDate.toISOString());

    // 日別に集計
    const dailyStats: Record<string, { count: number; totalMinutes: number }> = {};
    talks?.forEach((talk) => {
      const date = talk.created_at.split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, totalMinutes: 0 };
      }
      dailyStats[date].count += 1;
      dailyStats[date].totalMinutes += (talk.duration_seconds || 0) / 60;
    });

    // 時系列データを配列に変換
    const timeSeriesData = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const stats = dailyStats[dateStr] || { count: 0, totalMinutes: 0 };
      timeSeriesData.push({
        date: dateStr,
        count: stats.count,
        totalMinutes: Math.round(stats.totalMinutes),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 総計
    const { count: totalTalks } = await supabase
      .from("talks")
      .select("id", { count: "exact", head: true });

    const { data: allTalks } = await supabase
      .from("talks")
      .select("duration_seconds");

    const totalMinutes = allTalks?.reduce((acc, talk) => {
      return acc + (talk.duration_seconds || 0) / 60;
    }, 0) || 0;

    // ステータス別
    const statusBreakdown: Record<string, number> = {};
    talks?.forEach((talk) => {
      const status = talk.status || "unknown";
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    // 平均会話時間
    const completedTalks = allTalks?.filter((t) => t.duration_seconds && t.duration_seconds > 0) || [];
    const avgMinutes = completedTalks.length > 0
      ? completedTalks.reduce((acc, t) => acc + (t.duration_seconds || 0), 0) / completedTalks.length / 60
      : 0;

    return NextResponse.json({
      totalTalks: totalTalks || 0,
      totalMinutes: Math.round(totalMinutes),
      avgMinutesPerTalk: Math.round(avgMinutes * 10) / 10,
      timeSeries: timeSeriesData,
      statusBreakdown,
    });
  } catch (error) {
    console.error("[Admin Talks] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch talk stats" },
      { status: 500 }
    );
  }
}

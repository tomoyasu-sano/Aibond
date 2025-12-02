/**
 * Admin Users API
 * GET /api/admin/users - Get user statistics and list
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // 日別のユーザー登録数を取得（時系列データ）
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const { data: users } = await supabase
      .from("profiles")
      .select("id, display_name, language, created_at")
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // 日別の新規ユーザー数を集計
    const { data: allUsersInPeriod } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString());

    // 日別に集計
    const dailySignups: Record<string, number> = {};
    allUsersInPeriod?.forEach((user) => {
      const date = user.created_at.split("T")[0];
      dailySignups[date] = (dailySignups[date] || 0) + 1;
    });

    // 時系列データを配列に変換
    const timeSeriesData = [];
    const currentDate = new Date(startDate);
    const today = new Date();
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      timeSeriesData.push({
        date: dateStr,
        count: dailySignups[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 累積ユーザー数を計算
    let cumulative = 0;
    const { data: usersBeforePeriod } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .lt("created_at", startDate.toISOString());

    cumulative = usersBeforePeriod?.length || 0;

    const cumulativeData = timeSeriesData.map((item) => {
      cumulative += item.count;
      return {
        ...item,
        cumulative,
      };
    });

    // 総ユーザー数
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // 言語別ユーザー数
    const { data: languageData } = await supabase
      .from("profiles")
      .select("language");

    const languageBreakdown: Record<string, number> = {};
    languageData?.forEach((user) => {
      const lang = user.language || "unknown";
      languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;
    });

    return NextResponse.json({
      users,
      totalUsers: totalUsers || 0,
      timeSeries: cumulativeData,
      languageBreakdown,
      page,
      limit,
    });
  } catch (error) {
    console.error("[Admin Users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}

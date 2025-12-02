/**
 * 感情分析結果一覧API
 *
 * GET /api/sentiments - 分析結果一覧を取得
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type TrendDirection = "improving" | "stable" | "declining";

/**
 * GET - 分析結果一覧を取得
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // クエリパラメータを取得
  const url = new URL(request.url);
  const period = parseInt(url.searchParams.get("period") || "90");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  // パートナーシップを取得
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  if (!partnership) {
    return NextResponse.json({
      sentiments: [],
      summary: null,
      message: "パートナーとの連携が必要です",
    });
  }

  // 期間の開始日を計算
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  // 分析結果を取得
  const { data: sentiments, error } = await supabase
    .from("talk_sentiments")
    .select(`
      id,
      talk_id,
      status,
      skip_reason,
      positive_ratio,
      neutral_ratio,
      negative_ratio,
      volatility_score,
      constructiveness_score,
      understanding_score,
      overall_score,
      ai_insights,
      analyzed_at,
      talk_duration_minutes,
      talk_time_of_day,
      talk_day_of_week,
      talks(started_at, summary, speaker1_name, speaker2_name)
    `)
    .eq("partnership_id", partnership.id)
    .gte("analyzed_at", startDate.toISOString())
    .order("analyzed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Sentiments API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // サマリーを計算
  const completedSentiments = sentiments?.filter(
    (s) => s.status === "completed"
  ) || [];
  const insufficientData = sentiments?.filter(
    (s) => s.status === "insufficient_data"
  ).length || 0;

  let summary = null;

  if (completedSentiments.length > 0) {
    // 平均スコアを計算
    const avgVolatility =
      completedSentiments.reduce(
        (sum, s) => sum + (s.volatility_score || 0),
        0
      ) / completedSentiments.length;
    const avgConstructiveness =
      completedSentiments.reduce(
        (sum, s) => sum + (s.constructiveness_score || 0),
        0
      ) / completedSentiments.length;
    const avgUnderstanding =
      completedSentiments.reduce(
        (sum, s) => sum + (s.understanding_score || 0),
        0
      ) / completedSentiments.length;
    const avgOverall =
      completedSentiments.reduce(
        (sum, s) => sum + (s.overall_score || 0),
        0
      ) / completedSentiments.length;

    // トレンドを計算
    // データ件数に応じて比較グループを決定
    const total = completedSentiments.length;
    let recent: typeof completedSentiments;
    let previous: typeof completedSentiments;

    if (total === 1) {
      // 1件のみ: 比較不可
      recent = completedSentiments;
      previous = [];
    } else if (total === 2) {
      // 2件: 1回目 vs 2回目
      recent = completedSentiments.slice(0, 1);
      previous = completedSentiments.slice(1, 2);
    } else if (total === 3) {
      // 3件: 1回目 vs 2,3回目の平均
      recent = completedSentiments.slice(0, 1);
      previous = completedSentiments.slice(1, 3);
    } else if (total < 10) {
      // 4〜9件: 半分で分割
      const half = Math.floor(total / 2);
      recent = completedSentiments.slice(0, half);
      previous = completedSentiments.slice(half);
    } else {
      // 10件以上: 直近5件 vs 6〜10件目
      recent = completedSentiments.slice(0, 5);
      previous = completedSentiments.slice(5, 10);
    }

    // 閾値: この値以上は「良いスコア」とみなし、微減でも低下傾向にしない
    const GOOD_SCORE_THRESHOLD = 7;
    // volatilityは反転するため、4以下（= 安定度7以上）が良いスコア
    const GOOD_VOLATILITY_THRESHOLD = 4;

    const calculateTrend = (
      recentData: typeof recent,
      previousData: typeof previous,
      field: "constructiveness_score" | "understanding_score" | "volatility_score"
    ): TrendDirection => {
      if (previousData.length === 0) return "stable";

      const recentAvg =
        recentData.reduce((sum, s) => sum + (s[field] || 0), 0) /
        recentData.length;
      const previousAvg =
        previousData.reduce((sum, s) => sum + (s[field] || 0), 0) /
        previousData.length;

      const diff = recentAvg - previousAvg;

      // volatilityは低い方が良いので反転
      if (field === "volatility_score") {
        // 改善: volatilityが0.5以上減った
        if (diff < -0.5) return "improving";
        // 良いスコア（volatility ≤ 4）を維持していれば安定
        if (recentAvg <= GOOD_VOLATILITY_THRESHOLD) return "stable";
        // 悪化: volatilityが増えた（閾値以下で）
        if (diff > 0) return "declining";
        return "stable";
      }

      // 改善: 0.5以上上がった
      if (diff > 0.5) return "improving";
      // 良いスコア（7以上）を維持していれば安定
      if (recentAvg >= GOOD_SCORE_THRESHOLD) return "stable";
      // 低下: 閾値未満で下がっている
      if (diff < 0) return "declining";
      return "stable";
    };

    summary = {
      totalAnalyzed: completedSentiments.length,
      insufficientData,
      averageScores: {
        volatility: Math.round(avgVolatility * 10) / 10,
        constructiveness: Math.round(avgConstructiveness * 10) / 10,
        understanding: Math.round(avgUnderstanding * 10) / 10,
        overall: Math.round(avgOverall * 10) / 10,
      },
      trends: {
        constructiveness: calculateTrend(
          recent,
          previous,
          "constructiveness_score"
        ),
        understanding: calculateTrend(recent, previous, "understanding_score"),
        volatility: calculateTrend(recent, previous, "volatility_score"),
      },
    };
  }

  // レスポンス用にデータを整形
  const formattedSentiments = sentiments?.map((s) => {
    // talks is a foreign key relation (one-to-one)
    const talk = s.talks as unknown as { started_at?: string; summary?: string; speaker1_name?: string; speaker2_name?: string } | null;
    return {
      id: s.id,
      talkId: s.talk_id,
      status: s.status,
      skipReason: s.skip_reason,
      analyzedAt: s.analyzed_at,
      talkStartedAt: talk?.started_at,
      talkSummary: talk?.summary,
      speaker1Name: talk?.speaker1_name,
      speaker2Name: talk?.speaker2_name,
      positiveRatio: s.positive_ratio,
      neutralRatio: s.neutral_ratio,
      negativeRatio: s.negative_ratio,
      volatilityScore: s.volatility_score,
      constructivenessScore: s.constructiveness_score,
      understandingScore: s.understanding_score,
      overallScore: s.overall_score,
      overallComment: (s.ai_insights as { overallComment?: string })?.overallComment,
      talkDurationMinutes: s.talk_duration_minutes,
      talkTimeOfDay: s.talk_time_of_day,
      talkDayOfWeek: s.talk_day_of_week,
    };
  });

  return NextResponse.json({
    sentiments: formattedSentiments,
    summary,
  });
}

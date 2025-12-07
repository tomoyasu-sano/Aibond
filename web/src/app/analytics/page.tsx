"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SentimentData {
  id: string;
  talkId: string;
  status: string;
  skipReason: string | null;
  analyzedAt: string;
  talkStartedAt: string;
  talkTitle: string | null;
  positiveRatio: number | null;
  neutralRatio: number | null;
  negativeRatio: number | null;
  volatilityScore: number | null;
  constructivenessScore: number | null;
  understandingScore: number | null;
  overallScore: number | null;
  // AI insights
  goodPoints: string[];
  concerns: string[];
  suggestions: string[];
  comparisonWithPrevious: string;
  overallComment: string;
}

interface SentimentSummary {
  totalAnalyzed: number;
  insufficientData: number;
  averageScores: {
    volatility: number;
    constructiveness: number;
    understanding: number;
    overall: number;
  };
  trends: {
    constructiveness: "improving" | "stable" | "declining";
    understanding: "improving" | "stable" | "declining";
    volatility: "improving" | "stable" | "declining";
  };
}

type PeriodType = "recent5" | "30" | "90" | "all";

export default function AnalyticsPage() {
  const t = useTranslations("analytics");
  const tc = useTranslations("common");

  const [sentiments, setSentiments] = useState<SentimentData[]>([]);
  const [summary, setSummary] = useState<SentimentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("recent5");
  const [selectedSentiment, setSelectedSentiment] =
    useState<SentimentData | null>(null);

  useEffect(() => {
    const fetchSentiments = async () => {
      setLoading(true);
      try {
        const periodDays = period === "all" ? 365 : period === "recent5" ? 90 : parseInt(period);
        const res = await fetch(`/api/sentiments?period=${periodDays}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          let filteredSentiments = data.sentiments || [];

          // 期間でフィルタリング
          if (period === "recent5") {
            filteredSentiments = filteredSentiments
              .filter((s: SentimentData) => s.status === "completed")
              .slice(0, 5);
          }

          setSentiments(filteredSentiments);
          setSummary(data.summary);

          // 最新のものを選択
          const completed = filteredSentiments.filter(
            (s: SentimentData) => s.status === "completed"
          );
          if (completed.length > 0) {
            setSelectedSentiment(completed[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch sentiments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSentiments();
  }, [period]);

  // チャート用のデータを作成（古い順に並べる）
  const chartData = [...sentiments]
    .filter((s) => s.status === "completed")
    .reverse()
    .map((s) => ({
      date: new Date(s.talkStartedAt || s.analyzedAt).toLocaleDateString(
        "ja-JP",
        { month: "numeric", day: "numeric" }
      ),
      constructiveness: s.constructivenessScore,
      understanding: s.understandingScore,
      stability: s.volatilityScore ? 11 - s.volatilityScore : null, // 反転して「安定度」として表示
      overall: s.overallScore,
    }));

  const getTrendIcon = (
    trend: "improving" | "stable" | "declining" | undefined
  ) => {
    switch (trend) {
      case "improving":
        return "↑";
      case "declining":
        return "↓";
      default:
        return "→";
    }
  };

  const getTrendColor = (
    trend: "improving" | "stable" | "declining" | undefined
  ) => {
    switch (trend) {
      case "improving":
        return "text-green-500";
      case "declining":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getTrendLabel = (
    trend: "improving" | "stable" | "declining" | undefined
  ) => {
    switch (trend) {
      case "improving":
        return t("improving");
      case "declining":
        return t("declining");
      default:
        return t("stable");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{tc("appName")}</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="hidden md:block">
                <Button variant="ghost" size="sm">{t("backToDashboard")}</Button>
              </Link>
              <MobileNavMenu />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
        </main>
      </div>
    );
  }

  const completedSentiments = sentiments.filter((s) => s.status === "completed");
  const hasData = completedSentiments.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{tc("appName")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="hidden md:block">
              <Button variant="ghost" size="sm">{t("backToDashboard")}</Button>
            </Link>
            <MobileNavMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("pageTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("pageDescription")}</p>
        </div>

        {!hasData ? (
          /* No Data State */
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mb-4 text-6xl opacity-20">📊</div>
              <h3 className="text-lg font-semibold mb-2">{t("noData")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("noDataDescription")}
              </p>
              <Link href="/talks">
                <Button>会話を始める</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Period Selector */}
            <div className="mb-6 flex gap-2">
              {(["recent5", "30", "90", "all"] as PeriodType[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {p === "recent5"
                    ? t("periodRecent5")
                    : p === "30"
                    ? t("period1Month")
                    : p === "90"
                    ? t("period3Months")
                    : t("periodAll")}
                </Button>
              ))}
            </div>

            {/* Score Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    {t("overallScore")}
                    <span
                      className={`${getTrendColor(
                        summary?.trends?.constructiveness
                      )}`}
                    >
                      {getTrendIcon(summary?.trends?.constructiveness)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {summary?.averageScores.overall.toFixed(1) || "-"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("overallScoreDesc")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    {t("constructiveness")}
                    <span
                      className={`${getTrendColor(
                        summary?.trends?.constructiveness
                      )}`}
                    >
                      {getTrendLabel(summary?.trends?.constructiveness)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {summary?.averageScores.constructiveness.toFixed(1) || "-"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("constructivenessDesc")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    {t("understanding")}
                    <span
                      className={`${getTrendColor(
                        summary?.trends?.understanding
                      )}`}
                    >
                      {getTrendLabel(summary?.trends?.understanding)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {summary?.averageScores.understanding.toFixed(1) || "-"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("understandingDesc")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    {t("emotionalStability")}
                    <span
                      className={`${getTrendColor(summary?.trends?.volatility)}`}
                    >
                      {getTrendLabel(summary?.trends?.volatility)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {summary?.averageScores.volatility
                      ? (11 - summary.averageScores.volatility).toFixed(1)
                      : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("emotionalStabilityDesc")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            {chartData.length >= 2 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{t("scoreTransition")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 10]} className="text-xs" />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="overall"
                          name={t("overallScore")}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="constructiveness"
                          name={t("constructiveness")}
                          stroke="#10b981"
                          strokeWidth={1.5}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="understanding"
                          name={t("understanding")}
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="stability"
                          name={t("emotionalStability")}
                          stroke="#8b5cf6"
                          strokeWidth={1.5}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Feedback */}
            {selectedSentiment && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t("aiFeedback")}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedSentiment.talkStartedAt || selectedSentiment.analyzedAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}の会話
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Overall Comment */}
                  {selectedSentiment.overallComment && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                      <p className="text-sm font-medium">
                        {selectedSentiment.overallComment}
                      </p>
                    </div>
                  )}

                  {/* Good Points */}
                  {selectedSentiment.goodPoints && selectedSentiment.goodPoints.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2 mb-2">
                        ✅ {t("goodPoints")}
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {selectedSentiment.goodPoints.map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Concerns */}
                  {selectedSentiment.concerns && selectedSentiment.concerns.length > 0 && (
                    <div>
                      <h4 className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-2">
                        ⚠️ 気になる点
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {selectedSentiment.concerns.map((concern, index) => (
                          <li key={index}>{concern}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {selectedSentiment.suggestions && selectedSentiment.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-2">
                        💡 {t("suggestions")}
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {selectedSentiment.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Comparison with Previous */}
                  {selectedSentiment.comparisonWithPrevious && (
                    <div>
                      <h4 className="font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2 mb-2">
                        📊 前回との比較
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedSentiment.comparisonWithPrevious}
                      </p>
                    </div>
                  )}

                  {/* Low Score Message */}
                  {selectedSentiment.overallScore &&
                    selectedSentiment.overallScore <= 4 && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          💭 {t("lowScoreMessage")}
                        </p>
                      </div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Analysis History */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t("analysisHistory")}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    クリックすると上のAIフィードバックが切り替わります
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sentiments.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSentiment?.id === s.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() =>
                        s.status === "completed" && setSelectedSentiment(s)
                      }
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground w-16">
                          {new Date(
                            s.talkStartedAt || s.analyzedAt
                          ).toLocaleDateString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                          })}
                        </span>
                        {s.status === "completed" ? (
                          <>
                            <span className="font-medium">
                              {t("overallScore")}{" "}
                              {s.overallScore?.toFixed(1) || "-"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {t("constructiveness").substring(0, 1)}{" "}
                              {s.constructivenessScore}
                              {" / "}
                              {t("understanding").substring(0, 1)}{" "}
                              {s.understandingScore}
                              {" / "}
                              {t("emotionalStability").substring(0, 1)}{" "}
                              {s.volatilityScore ? 11 - s.volatilityScore : "-"}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            --- {t("insufficientData")} ---
                          </span>
                        )}
                      </div>
                      {s.overallComment && s.status === "completed" && (
                        <span className="text-sm text-muted-foreground max-w-xs truncate">
                          「{s.overallComment}」
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";

interface SentimentData {
  id: string;
  overallScore: number | null;
  analyzedAt: string;
  overallComment?: string;
}

export function SentimentCard() {
  const t = useTranslations("analytics");
  const [sentiments, setSentiments] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [latestComment, setLatestComment] = useState<string>("");

  useEffect(() => {
    const fetchSentiments = async () => {
      try {
        // status=completed でサーバーサイドフィルター
        const res = await fetch("/api/sentiments?period=90&limit=10&status=completed");
        if (res.ok) {
          const data = await res.json();
          const completed = (data.sentiments || []).slice(0, 5);

          setSentiments(completed);

          if (completed.length > 0) {
            setLatestScore(completed[0].overallScore);
            setLatestComment(completed[0].overallComment || "");
            if (completed.length > 1) {
              setPreviousScore(completed[1].overallScore);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch sentiments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSentiments();
  }, []);

  // ミニチャート用のデータを作成（古い順に並べる）
  const chartData = [...sentiments]
    .reverse()
    .map((s) => ({
      score: s.overallScore || 0,
    }));

  // スコアの変化を計算
  const scoreDiff =
    latestScore !== null && previousScore !== null
      ? Math.round((latestScore - previousScore) * 10) / 10
      : null;

  const formatScoreDiff = () => {
    if (scoreDiff === null) return null;
    if (scoreDiff > 0) return `↑ ${scoreDiff}`;
    if (scoreDiff < 0) return `↓ ${Math.abs(scoreDiff)}`;
    return "→";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
          {t("dashboardCardTitle")}
        </CardTitle>
        <CardDescription>
          {t("pageDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 animate-pulse rounded bg-muted" />
        ) : sentiments.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              {t("dashboardCardNoData")}
            </p>
            <Link href="/talks">
              <Button variant="outline" size="sm">
                会話を始める
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* スコア表示 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("dashboardCardLatest")}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-medium">
                    {latestScore?.toFixed(1) || "-"}
                  </span>
                  <span className="text-base text-muted-foreground">/ 10</span>
                  {scoreDiff !== null && (
                    <span
                      className={`text-sm ${
                        scoreDiff > 0
                          ? "text-green-500"
                          : scoreDiff < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatScoreDiff()}
                    </span>
                  )}
                </div>
              </div>

              {/* ミニチャート */}
              {chartData.length >= 2 && (
                <div className="w-24 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <YAxis domain={[0, 10]} hide />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 詳細リンク */}
            <Link href="/analytics" className="block">
              <Button variant="outline" className="w-full">
                {t("dashboardCardViewDetail")}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

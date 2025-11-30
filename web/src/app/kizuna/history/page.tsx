"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RatingIcon } from "@/components/kizuna/RatingIcon";
import { ReviewResultIcon, EmptyHistoryIcon } from "@/components/kizuna/KizunaIcons";

interface ReviewItem {
  id: string;
  result: "completed" | "continue" | "modified" | "abandoned";
  note: string | null;
  created_at: string;
  kizuna_items: {
    id: string;
    content: string;
    type: string;
    kizuna_topics: {
      id: string;
      title: string;
    };
  };
}

interface FeedbackItem {
  id: string;
  rating: "good" | "neutral" | "bad";
  comment: string | null;
  created_at: string;
  user_id: string;
  kizuna_items: {
    id: string;
    content: string;
    type: string;
    kizuna_topics: {
      id: string;
      title: string;
    };
  };
}

interface Stats {
  total_topics: number;
  resolved_topics: number;
  completed_promises: number;
  total_feedbacks: number;
  review_breakdown?: {
    completed: number;
    continue: number;
    modified: number;
    abandoned: number;
  };
}

const resultConfig = {
  completed: { label: "達成", color: "text-green-600" },
  continue: { label: "継続", color: "text-blue-600" },
  modified: { label: "修正", color: "text-yellow-600" },
  abandoned: { label: "断念", color: "text-gray-600" },
};


export default function KizunaHistoryPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "reviews" | "feedbacks">("overview");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/kizuna/history");
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      setReviews(data.reviews || []);
      setFeedbacks(data.feedbacks || []);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const hasData = stats && (stats.total_topics > 0 || reviews.length > 0 || feedbacks.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">振り返り</h1>
          <p className="text-muted-foreground">
            二人の関係改善の歩みを確認
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        ) : !hasData ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <EmptyHistoryIcon size={56} />
              </div>
              <p className="text-muted-foreground mb-2">
                まだ振り返りデータがありません
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                絆ノートで約束を追加してレビューすると、ここに履歴が表示されます
              </p>
              <Link href="/kizuna">
                <Button>絆ノートへ</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* タブ */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={tab === "overview" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("overview")}
              >
                サマリー
              </Button>
              <Button
                variant={tab === "reviews" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("reviews")}
              >
                レビュー履歴
              </Button>
              <Button
                variant={tab === "feedbacks" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("feedbacks")}
              >
                評価履歴
              </Button>
            </div>

            {/* サマリータブ */}
            {tab === "overview" && stats && (
              <div className="space-y-6">
                {/* 統計カード */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-primary">
                        {stats.total_topics}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        テーマ
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {stats.resolved_topics}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        解決済み
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {stats.completed_promises}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        達成した約束
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-purple-600">
                        {stats.total_feedbacks}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        評価数
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* レビュー内訳 */}
                {stats.review_breakdown && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">レビュー結果の内訳</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(stats.review_breakdown).map(([key, count]) => {
                          const config = resultConfig[key as keyof typeof resultConfig];
                          const total = Object.values(stats.review_breakdown!).reduce((a, b) => a + b, 0);
                          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5 w-20 text-sm">
                                <ReviewResultIcon result={key} size={16} />
                                {config.label}
                              </span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    key === "completed"
                                      ? "bg-green-500"
                                      : key === "continue"
                                      ? "bg-blue-500"
                                      : key === "modified"
                                      ? "bg-yellow-500"
                                      : "bg-gray-400"
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="w-12 text-sm text-right text-muted-foreground">
                                {count}件
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 最近のアクティビティ */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">最近のアクティビティ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviews.length === 0 && feedbacks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        まだアクティビティがありません
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {[...reviews.slice(0, 3), ...feedbacks.slice(0, 3)]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .slice(0, 5)
                          .map((item) => {
                            const isReview = "result" in item;
                            return (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 text-sm"
                              >
                                {isReview ? (
                                  <ReviewResultIcon result={(item as ReviewItem).result} size={20} />
                                ) : (
                                  <RatingIcon rating={(item as FeedbackItem).rating} size="sm" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="truncate">
                                    {item.kizuna_items.content}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(item.created_at)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* レビュー履歴タブ */}
            {tab === "reviews" && (
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        まだレビュー履歴がありません
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  reviews.map((review) => {
                    const config = resultConfig[review.result];
                    return (
                      <Card key={review.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <ReviewResultIcon result={review.result} size={24} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-medium ${config.color}`}>
                                  {config.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(review.created_at)}
                                </span>
                              </div>
                              <p className="text-sm mb-1">
                                {review.kizuna_items.content}
                              </p>
                              <Link
                                href={`/kizuna/${review.kizuna_items.kizuna_topics.id}`}
                                className="text-xs text-primary hover:underline"
                              >
                                {review.kizuna_items.kizuna_topics.title}
                              </Link>
                              {review.note && (
                                <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                                  {review.note}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* 評価履歴タブ */}
            {tab === "feedbacks" && (
              <div className="space-y-3">
                {feedbacks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        まだ評価履歴がありません
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  feedbacks.map((feedback) => (
                    <Card key={feedback.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <RatingIcon rating={feedback.rating} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(feedback.created_at)}
                              </span>
                            </div>
                            <p className="text-sm mb-1">
                              {feedback.kizuna_items.content}
                            </p>
                            <Link
                              href={`/kizuna/${feedback.kizuna_items.kizuna_topics.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              {feedback.kizuna_items.kizuna_topics.title}
                            </Link>
                            {feedback.comment && (
                              <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                                {feedback.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/kizuna" className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>絆ノート</span>
        </Link>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          Aibond
        </Link>
      </div>
    </header>
  );
}

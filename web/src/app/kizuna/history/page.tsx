"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RatingIcon } from "@/components/kizuna/RatingIcon";
import { ReviewResultIcon, EmptyHistoryIcon, TopicStatusIcon } from "@/components/kizuna/KizunaIcons";

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

// テーマ別にグループ化した評価
interface GroupedFeedbackByTopic {
  topicId: string;
  topicTitle: string;
  items: {
    itemId: string;
    itemContent: string;
    itemType: string;
    feedbacks: FeedbackItem[];
  }[];
}

// テーマ別にグループ化したレビュー
interface GroupedReviewByTopic {
  topicId: string;
  topicTitle: string;
  reviews: ReviewItem[];
}

const resultConfig = {
  completed: { label: "達成", color: "text-green-600" },
  continue: { label: "継続", color: "text-blue-600" },
  modified: { label: "修正", color: "text-yellow-600" },
  abandoned: { label: "終了", color: "text-gray-600" },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  promise: { label: "約束", color: "bg-blue-100 text-blue-700" },
  request: { label: "要望", color: "bg-purple-100 text-purple-700" },
  my_feeling: { label: "自分の気持ち", color: "bg-green-100 text-green-700" },
  partner_feeling: { label: "相手の気持ち", color: "bg-pink-100 text-pink-700" },
  memo: { label: "メモ", color: "bg-gray-100 text-gray-700" },
};


export default function KizunaHistoryPage() {
  const router = useRouter();
  const t = useTranslations("kizunaHistory");
  const tc = useTranslations("common");
  const tr = useTranslations("ratings");
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
      toast.error(t("emptyState"));
    } finally {
      setLoading(false);
    }
  };

  // 評価をテーマ別・アイテム別にグループ化
  const groupedFeedbacks = useMemo((): GroupedFeedbackByTopic[] => {
    const topicMap = new Map<string, GroupedFeedbackByTopic>();

    feedbacks.forEach((feedback) => {
      const topicId = feedback.kizuna_items.kizuna_topics.id;
      const topicTitle = feedback.kizuna_items.kizuna_topics.title;
      const itemId = feedback.kizuna_items.id;

      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, {
          topicId,
          topicTitle,
          items: [],
        });
      }

      const topic = topicMap.get(topicId)!;
      let item = topic.items.find((i) => i.itemId === itemId);

      if (!item) {
        item = {
          itemId,
          itemContent: feedback.kizuna_items.content,
          itemType: feedback.kizuna_items.type,
          feedbacks: [],
        };
        topic.items.push(item);
      }

      item.feedbacks.push(feedback);
    });

    // 各アイテムの評価を日付順（古い→新しい）にソート（推移表示用）
    topicMap.forEach((topic) => {
      topic.items.forEach((item) => {
        item.feedbacks.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      // アイテムは最新の評価日でソート（新しい順）
      topic.items.sort((a, b) => {
        const aLatest = a.feedbacks[a.feedbacks.length - 1]?.created_at || "";
        const bLatest = b.feedbacks[b.feedbacks.length - 1]?.created_at || "";
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });
    });

    // テーマを最新のアクティビティ順にソート
    return Array.from(topicMap.values()).sort((a, b) => {
      const aLatest = a.items[0]?.feedbacks[a.items[0].feedbacks.length - 1]?.created_at || "";
      const bLatest = b.items[0]?.feedbacks[b.items[0].feedbacks.length - 1]?.created_at || "";
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });
  }, [feedbacks]);

  // レビューをテーマ別にグループ化
  const groupedReviews = useMemo((): GroupedReviewByTopic[] => {
    const topicMap = new Map<string, GroupedReviewByTopic>();

    reviews.forEach((review) => {
      const topicId = review.kizuna_items.kizuna_topics.id;
      const topicTitle = review.kizuna_items.kizuna_topics.title;

      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, {
          topicId,
          topicTitle,
          reviews: [],
        });
      }

      topicMap.get(topicId)!.reviews.push(review);
    });

    // 各テーマ内のレビューを新しい順にソート
    topicMap.forEach((topic) => {
      topic.reviews.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // テーマを最新のレビュー順にソート
    return Array.from(topicMap.values()).sort((a, b) => {
      const aLatest = a.reviews[0]?.created_at || "";
      const bLatest = b.reviews[0]?.created_at || "";
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });
  }, [reviews]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  const hasData = stats && (stats.total_topics > 0 || reviews.length > 0 || feedbacks.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Header t={t} tc={tc} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{t("pageTitle")}</h1>
          <p className="text-muted-foreground">
            {t("pageDescription")}
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
                {t("emptyState")}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {t("emptyDescription")}
              </p>
              <Link href="/kizuna">
                <Button>{t("backToKizuna")}</Button>
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
                {t("summaryTab")}
              </Button>
              <Button
                variant={tab === "reviews" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("reviews")}
              >
                {t("reviewsTab")}
              </Button>
              <Button
                variant={tab === "feedbacks" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("feedbacks")}
              >
                {t("feedbacksTab")}
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
                        {t("totalThemes")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {stats.resolved_topics}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("resolvedThemes")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {stats.completed_promises}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("completedPromises")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-purple-600">
                        {stats.total_feedbacks}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("totalFeedbacks")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* レビュー内訳 */}
                {stats.review_breakdown && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t("reviewBreakdown")}</CardTitle>
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
                                {count}{t("count")}
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
                    <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviews.length === 0 && feedbacks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("noActivity")}
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
                                    {item.kizuna_items.kizuna_topics.title} - {formatDate(item.created_at)}
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

            {/* レビュー履歴タブ - テーマ別グループ化 */}
            {tab === "reviews" && (
              <div className="space-y-6">
                {groupedReviews.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        {t("noReviews")}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  groupedReviews.map((group) => (
                    <div key={group.topicId} className="space-y-3">
                      {/* テーマヘッダー */}
                      <Link href={`/kizuna/${group.topicId}`}>
                        <div className="flex items-center gap-2 px-1 py-2 hover:bg-muted/50 rounded-lg transition-colors">
                          <TopicStatusIcon status="active" size={20} />
                          <h3 className="font-semibold text-base">{group.topicTitle}</h3>
                          <span className="text-xs text-muted-foreground">
                            ({group.reviews.length}件)
                          </span>
                        </div>
                      </Link>

                      {/* レビュー一覧 */}
                      <div className="space-y-2 pl-2 border-l-2 border-muted ml-2">
                        {group.reviews.map((review) => {
                          const config = resultConfig[review.result];
                          return (
                            <Card key={review.id} className="border-0 shadow-sm">
                              <CardContent className="py-3 px-4">
                                <div className="flex items-start gap-3">
                                  <ReviewResultIcon result={review.result} size={20} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-sm font-medium ${config.color}`}>
                                        {config.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatShortDate(review.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground/90">
                                      {review.kizuna_items.content}
                                    </p>
                                    {review.note && (
                                      <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                        {review.note}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 評価履歴タブ - テーマ別・アイテム別グループ化 */}
            {tab === "feedbacks" && (
              <div className="space-y-6">
                {groupedFeedbacks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        {t("noFeedbacks")}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  groupedFeedbacks.map((group) => (
                    <div key={group.topicId} className="space-y-3">
                      {/* テーマヘッダー */}
                      <Link href={`/kizuna/${group.topicId}`}>
                        <div className="flex items-center gap-2 px-1 py-2 hover:bg-muted/50 rounded-lg transition-colors">
                          <TopicStatusIcon status="active" size={20} />
                          <h3 className="font-semibold text-base">{group.topicTitle}</h3>
                          <span className="text-xs text-muted-foreground">
                            ({group.items.reduce((sum, item) => sum + item.feedbacks.length, 0)}件)
                          </span>
                        </div>
                      </Link>

                      {/* アイテム別評価一覧 */}
                      <div className="space-y-3 pl-2 border-l-2 border-muted ml-2">
                        {group.items.map((item) => (
                          <Card key={item.itemId} className="border-0 shadow-sm">
                            <CardContent className="py-3 px-4">
                              {/* アイテム情報 */}
                              <div className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeConfig[item.itemType]?.color || "bg-gray-100 text-gray-700"}`}>
                                    {typeConfig[item.itemType]?.label || item.itemType}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground/90">
                                  {item.itemContent}
                                </p>
                              </div>

                              {/* 評価の推移 */}
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs text-muted-foreground mr-2">{t("ratingTransition")}:</span>
                                {item.feedbacks.map((feedback, index) => (
                                  <div
                                    key={feedback.id}
                                    className="group relative"
                                    title={`${formatShortDate(feedback.created_at)}${feedback.comment ? `: ${feedback.comment}` : ""}`}
                                  >
                                    <div className="flex items-center">
                                      <RatingIcon rating={feedback.rating} size="sm" />
                                      {index < item.feedbacks.length - 1 && (
                                        <span className="text-muted-foreground mx-0.5">→</span>
                                      )}
                                    </div>
                                    {/* ツールチップ */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                      {formatShortDate(feedback.created_at)}
                                      {feedback.comment && (
                                        <span className="block text-muted-foreground max-w-[150px] truncate">
                                          {feedback.comment}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* 最新の評価日 */}
                              <p className="text-xs text-muted-foreground mt-2">
                                {t("latestRating")}: {formatShortDate(item.feedbacks[item.feedbacks.length - 1].created_at)}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
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

function Header({ t, tc }: { t: any; tc: any }) {
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
          <span>{t("backToKizuna")}</span>
        </Link>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          {tc("appName")}
        </Link>
      </div>
    </header>
  );
}

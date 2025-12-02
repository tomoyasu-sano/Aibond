"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmptyStateIcon, TopicStatusIcon, ReviewDueIcon } from "@/components/kizuna/KizunaIcons";

interface Topic {
  id: string;
  title: string;
  status: "active" | "resolved";
  created_at: string;
  updated_at: string;
  item_count: number;
  review_due_count: number;
}

interface ReviewAlert {
  id: string;
  type: string;
  content: string;
  review_date: string;
  topic_id: string;
  topic_title: string;
  days_remaining: number;
  urgency: "overdue" | "urgent" | "soon";
}

export default function KizunaPage() {
  const router = useRouter();
  const t = useTranslations("kizuna");
  const tc = useTranslations("common");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [reviewAlerts, setReviewAlerts] = useState<ReviewAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [topicsRes, alertsRes] = await Promise.all([
        fetch("/api/kizuna/topics"),
        fetch("/api/kizuna/review-alerts"),
      ]);

      if (topicsRes.status === 401) {
        router.push("/login");
        return;
      }

      const [topicsData, alertsData] = await Promise.all([
        topicsRes.json(),
        alertsRes.json(),
      ]);

      setTopics(topicsData.topics || []);
      setReviewAlerts(alertsData.items || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(t("fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const createTopic = async () => {
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/kizuna/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(t("themeCreatedSuccess"));
        router.push(`/kizuna/${data.topic.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || t("createFailed"));
      }
    } catch (error) {
      console.error("Error creating topic:", error);
      toast.error(t("createFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case "overdue":
        return {
          color: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
          badge: "bg-orange-600 text-white",
        };
      case "urgent":
        return {
          color: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
          badge: "bg-orange-500 text-white",
        };
      default:
        return {
          color: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
          badge: "bg-orange-400 text-white",
        };
    }
  };

  const getDaysText = (days: number) => {
    if (days < 0) {
      return `${Math.abs(days)}日超過`;
    } else if (days === 0) {
      return "今日";
    } else {
      return `あと${days}日`;
    }
  };

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
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
              <span>{t("backToDashboard")}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
            <p className="text-muted-foreground">{tc("loading")}</p>
          </div>
        </main>
      </div>
    );
  }

  const activeTopics = topics.filter((t) => t.status === "active");
  const resolvedTopics = topics.filter((t) => t.status === "resolved");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
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
            <span>{t("backToDashboard")}</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">{t("pageTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("pageDescription")}</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            {t("addTheme")}
          </Button>
        </div>

        {/* 見直し時期アラート */}
        {reviewAlerts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ReviewDueIcon size={20} className="text-orange-600" />
              <h2 className="text-lg font-semibold">見直し時期が近い項目</h2>
              <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                {reviewAlerts.length}
              </span>
            </div>
            <div className="space-y-2">
              {reviewAlerts.map((alert) => {
                const config = getUrgencyConfig(alert.urgency);
                return (
                  <Link key={alert.id} href={`/kizuna/${alert.topic_id}`}>
                    <Card className={`${config.color} border transition-all hover:shadow-md cursor-pointer`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {alert.topic_title}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${config.badge}`}>
                                {getDaysText(alert.days_remaining)}
                              </span>
                            </div>
                            <p className="text-sm font-medium line-clamp-1">{alert.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              見直し時期: {formatDate(alert.review_date)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* テーマ一覧 */}
        {topics.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <EmptyStateIcon size={56} />
              </div>
              <p className="text-muted-foreground mb-2">{t("noThemes")}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t("suggestTheme")}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                {t("addTheme")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 継続中のテーマ */}
            {activeTopics.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  継続中のテーマ ({activeTopics.length})
                </h2>
                <div className="grid gap-3">
                  {activeTopics.map((topic) => (
                    <Link key={topic.id} href={`/kizuna/${topic.id}`}>
                      <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                        <CardContent className="py-4 px-5">
                          <div className="flex items-start gap-3">
                            <TopicStatusIcon status={topic.status} size={24} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base">{topic.title}</h3>
                                {topic.review_due_count > 0 && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                                    <ReviewDueIcon size={12} />
                                    {topic.review_due_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {topic.item_count}件の項目 • {formatDate(topic.updated_at)}更新
                              </p>
                            </div>
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
                              className="text-muted-foreground flex-shrink-0 mt-1"
                            >
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 解決済みのテーマ */}
            {resolvedTopics.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  解決済みのテーマ ({resolvedTopics.length})
                </h2>
                <div className="grid gap-3">
                  {resolvedTopics.map((topic) => (
                    <Link key={topic.id} href={`/kizuna/${topic.id}`}>
                      <Card className="transition-all hover:shadow-md cursor-pointer opacity-70 hover:opacity-100">
                        <CardContent className="py-4 px-5">
                          <div className="flex items-start gap-3">
                            <TopicStatusIcon status={topic.status} size={24} />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base mb-1">{topic.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {topic.item_count}件の項目 • {formatDate(topic.updated_at)}更新
                              </p>
                            </div>
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
                              className="text-muted-foreground flex-shrink-0 mt-1"
                            >
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 新規作成ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createNewTheme")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t("themePlaceholder")}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t("helperText")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={createTopic}
              disabled={isCreating || !newTitle.trim()}
            >
              {isCreating ? t("creatingButton") : t("createButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RatingIcon } from "@/components/kizuna/RatingIcon";
import {
  TopicStatusIcon,
  ReviewDueIcon,
  HistoryIcon,
  EmptyStateIcon,
} from "@/components/kizuna/KizunaIcons";

interface Topic {
  id: string;
  title: string;
  status: "active" | "resolved";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  item_count: number;
  latest_rating: "good" | "neutral" | "bad" | null;
  review_due_count: number;
}


export default function KizunaPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTopics();
  }, [filter]);

  const fetchTopics = async () => {
    try {
      let url = "/api/kizuna/topics";
      if (filter !== "all") {
        url += `?status=${filter}`;
      }

      const res = await fetch(url);
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error("Error fetching topics:", error);
      toast.error("テーマの取得に失敗しました");
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
        toast.success("テーマを作成しました");
        setIsDialogOpen(false);
        setNewTitle("");
        // 新しいテーマの詳細ページに遷移
        router.push(`/kizuna/${data.topic.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "テーマの作成に失敗しました");
      }
    } catch (error) {
      console.error("Error creating topic:", error);
      toast.error("テーマの作成に失敗しました");
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

  const activeTopics = topics.filter((t) => t.status === "active");
  const resolvedTopics = topics.filter((t) => t.status === "resolved");

  return (
    <div className="min-h-screen bg-background">
      <Header onAddClick={() => setIsDialogOpen(true)} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">絆ノート</h1>
          <p className="text-muted-foreground">
            二人の関係を良くするための約束・習慣・要望を記録
          </p>
        </div>

        {/* フィルター */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            継続中
          </Button>
          <Button
            variant={filter === "resolved" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("resolved")}
          >
            解決済み
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            すべて
          </Button>
        </div>

        {/* コンテンツ */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : topics.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-4">
                <EmptyStateIcon size={56} />
              </div>
              <p className="text-muted-foreground mb-2">
                {filter === "resolved"
                  ? "解決済みのテーマはありません"
                  : "テーマがありません"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                二人で話し合いたいことや、改善したいことを追加しましょう
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                最初のテーマを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* 継続中 */}
            {filter !== "resolved" && activeTopics.length > 0 && (
              <div>
                {filter === "all" && (
                  <h2 className="text-sm font-medium text-muted-foreground mb-3">
                    継続中のテーマ
                  </h2>
                )}
                <div className="space-y-4">
                  {activeTopics.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} />
                  ))}
                </div>
              </div>
            )}

            {/* 解決済み */}
            {filter !== "active" && resolvedTopics.length > 0 && (
              <div>
                {filter === "all" && (
                  <h2 className="text-sm font-medium text-muted-foreground mb-3 mt-6">
                    解決済み
                  </h2>
                )}
                <div className="space-y-4">
                  {resolvedTopics.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} />
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
            <DialogTitle>新しいテーマを作成</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="例: スキンシップについて、家事の分担..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  createTopic();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              二人で話し合いたいこと、改善したいことを入力してください
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={createTopic}
              disabled={isCreating || !newTitle.trim()}
            >
              {isCreating ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TopicCard({ topic }: { topic: Topic }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Link href={`/kizuna/${topic.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <TopicStatusIcon status={topic.status} size={22} />
                <h3 className="font-medium truncate">{topic.title}</h3>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>更新: {formatDate(topic.updated_at)}</span>
                {topic.item_count > 0 && <span>項目: {topic.item_count}件</span>}
                {topic.review_due_count > 0 && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <ReviewDueIcon size={14} />
                    {topic.review_due_count}件
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {topic.latest_rating && (
                <RatingIcon rating={topic.latest_rating} size="sm" />
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  topic.status === "resolved"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {topic.status === "resolved" ? "解決" : "継続中"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Header({ onAddClick }: { onAddClick: () => void }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
          <span>ダッシュボード</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/kizuna/history">
            <Button variant="ghost" size="sm" className="gap-1">
              <HistoryIcon size={16} />
              振り返り
            </Button>
          </Link>
          <Button size="sm" onClick={onAddClick}>
            + 新規
          </Button>
        </div>
      </div>
    </header>
  );
}

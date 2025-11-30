"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Promise {
  id: string;
  content: string;
  is_completed: boolean;
  is_manual: boolean;
  talk_id: string | null;
  created_at: string;
  completed_at: string | null;
  talks?: { started_at: string } | null;
}

export default function PromisesPage() {
  const router = useRouter();
  const [promises, setPromises] = useState<Promise[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [newPromise, setNewPromise] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Promise | null>(null);

  useEffect(() => {
    fetchPromises();
  }, [filter]);

  const fetchPromises = async () => {
    try {
      let url = "/api/promises";
      if (filter === "pending") {
        url += "?completed=false";
      } else if (filter === "completed") {
        url += "?completed=true";
      }

      const res = await fetch(url);
      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      setPromises(data.promises || []);
    } catch (error) {
      console.error("Error fetching promises:", error);
      toast.error("約束リストの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (promise: Promise) => {
    const newStatus = !promise.is_completed;

    // 楽観的更新
    setPromises((prev) =>
      prev.map((p) =>
        p.id === promise.id ? { ...p, is_completed: newStatus } : p
      )
    );

    try {
      const res = await fetch(`/api/promises/${promise.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: newStatus }),
      });

      if (!res.ok) {
        // 失敗したら元に戻す
        setPromises((prev) =>
          prev.map((p) =>
            p.id === promise.id ? { ...p, is_completed: !newStatus } : p
          )
        );
        toast.error("更新に失敗しました");
      }
    } catch (error) {
      // 失敗したら元に戻す
      setPromises((prev) =>
        prev.map((p) =>
          p.id === promise.id ? { ...p, is_completed: !newStatus } : p
        )
      );
      toast.error("更新に失敗しました");
    }
  };

  const addPromise = async () => {
    if (!newPromise.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/promises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPromise.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setPromises((prev) => [data.promise, ...prev]);
        setNewPromise("");
        toast.success("約束を追加しました");
      } else {
        toast.error("約束の追加に失敗しました");
      }
    } catch (error) {
      console.error("Error adding promise:", error);
      toast.error("約束の追加に失敗しました");
    } finally {
      setIsAdding(false);
    }
  };

  const deletePromise = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/promises/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPromises((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        toast.success("約束を削除しました");
      } else {
        toast.error("削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting promise:", error);
      toast.error("削除に失敗しました");
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  const pendingCount = promises.filter((p) => !p.is_completed).length;
  const completedCount = promises.filter((p) => p.is_completed).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">約束リスト</h1>
          <p className="text-muted-foreground">
            未完了: {pendingCount}件 / 完了: {completedCount}件
          </p>
        </div>

        {/* フィルタータブ */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            すべて
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            未完了
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            完了
          </Button>
        </div>

        {/* 新規追加 */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="新しい約束を追加..."
                value={newPromise}
                onChange={(e) => setNewPromise(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    addPromise();
                  }
                }}
              />
              <Button onClick={addPromise} disabled={isAdding || !newPromise.trim()}>
                {isAdding ? "追加中..." : "追加"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 約束リスト */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : promises.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {filter === "pending"
                  ? "未完了の約束はありません"
                  : filter === "completed"
                  ? "完了した約束はありません"
                  : "約束がありません"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                会話から自動で抽出されるか、上から手動で追加できます
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {promises.map((promise) => (
              <Card
                key={promise.id}
                className={promise.is_completed ? "opacity-60" : ""}
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={promise.is_completed}
                      onCheckedChange={() => toggleComplete(promise)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={
                          promise.is_completed ? "line-through text-muted-foreground" : ""
                        }
                      >
                        {promise.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatDate(promise.created_at)}</span>
                        {promise.is_manual ? (
                          <span className="bg-muted px-1.5 py-0.5 rounded">手動</span>
                        ) : (
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            AI抽出
                          </span>
                        )}
                        {promise.talk_id && (
                          <Link
                            href={`/talks/${promise.talk_id}`}
                            className="text-primary hover:underline"
                          >
                            会話を見る
                          </Link>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(promise)}
                    >
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
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>約束を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.content}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={deletePromise}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Header() {
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
          <span>ダッシュボードへ</span>
        </Link>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          Aibond
        </Link>
      </div>
    </header>
  );
}

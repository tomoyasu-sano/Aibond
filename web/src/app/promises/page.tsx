"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("promises");
  const tc = useTranslations("common");
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
      toast.error(t("fetchFailed"));
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
        toast.error(t("updateFailed"));
      }
    } catch (error) {
      // 失敗したら元に戻す
      setPromises((prev) =>
        prev.map((p) =>
          p.id === promise.id ? { ...p, is_completed: !newStatus } : p
        )
      );
      toast.error(t("updateFailed"));
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
        toast.success(t("createSuccessful"));
      } else {
        toast.error(t("createFailed"));
      }
    } catch (error) {
      console.error("Error adding promise:", error);
      toast.error(t("createFailed"));
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
        toast.success(t("deleteSuccessful"));
      } else {
        toast.error(t("deleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting promise:", error);
      toast.error(t("deleteFailed"));
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
      <Header t={t} tc={tc} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{t("pageTitle")}</h1>
          <p className="text-muted-foreground">
            {t("statusSummary", { pending: pendingCount, completed: completedCount })}
          </p>
        </div>

        {/* フィルタータブ */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            {t("allTab")}
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            {t("pending")}
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            {t("completedTab")}
          </Button>
        </div>

        {/* 新規追加 */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder={t("addNewPromise")}
                value={newPromise}
                onChange={(e) => setNewPromise(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    addPromise();
                  }
                }}
              />
              <Button onClick={addPromise} disabled={isAdding || !newPromise.trim()}>
                {isAdding ? t("addingButton") : t("addButton")}
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
                  ? t("noPendingPromises")
                  : filter === "completed"
                  ? t("noCompletedPromises")
                  : t("noPromises")}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t("helpText")}
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
                          <span className="bg-muted px-1.5 py-0.5 rounded">{t("manual")}</span>
                        ) : (
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {t("aiExtracted")}
                          </span>
                        )}
                        {promise.talk_id && (
                          <Link
                            href={`/talks/${promise.talk_id}`}
                            className="text-primary hover:underline"
                          >
                            {t("viewConversation")}
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
            <AlertDialogTitle>{t("deletePrompt")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { content: deleteTarget?.content || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deletePromise}>{tc("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Header({ t, tc }: { t: any; tc: any }) {
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
          <span>{t("backToDashboard")}</span>
        </Link>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          {tc("appName")}
        </Link>
      </div>
    </header>
  );
}

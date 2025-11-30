"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Talk {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: string;
  summary: string | null;
  speaker1_name: string | null;
  speaker2_name: string | null;
}

export default function TalksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [talks, setTalks] = useState<Talk[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTalks();
  }, []);

  const fetchTalks = async () => {
    try {
      const res = await fetch("/api/talks");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setTalks(data.talks || []);
    } catch (error) {
      console.error("Error fetching talks:", error);
      toast.error("会話一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const startNewTalk = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/talks", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      router.push(`/talks/${data.talk.id}`);
    } catch (error) {
      console.error("Error creating talk:", error);
      toast.error("会話の開始に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <span className="w-2 h-2 mr-1 bg-red-500 rounded-full animate-pulse" />
            録音中
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            一時停止
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            完了
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSignOut={handleSignOut} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">会話記録</h1>
            <p className="mt-2 text-muted-foreground">
              会話を録音して文字起こし・翻訳します
            </p>
          </div>
          <Button onClick={startNewTalk} disabled={creating} size="lg">
            {creating ? "開始中..." : "新しい会話を始める"}
          </Button>
        </div>

        {talks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                まだ会話記録がありません
              </p>
              <Button onClick={startNewTalk} disabled={creating}>
                最初の会話を始める
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {talks.map((talk) => (
              <Link key={talk.id} href={`/talks/${talk.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {formatDate(talk.started_at)}
                      </CardTitle>
                      {getStatusBadge(talk.status)}
                    </div>
                    <CardDescription>
                      {talk.speaker1_name} & {talk.speaker2_name}
                      {talk.duration_minutes && ` • ${talk.duration_minutes}分`}
                    </CardDescription>
                  </CardHeader>
                  {talk.summary && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {talk.summary}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Header({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">Aibond</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              ダッシュボード
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              設定
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

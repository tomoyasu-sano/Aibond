"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpeakerMappingDialog } from "@/components/talk/SpeakerMappingDialog";
import { toast } from "sonner";

interface Talk {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: string;
  summary: string | null;
  summary_status: string;
  promises: Array<{ content: string; speaker: number }> | null;
  next_topics: string[] | null;
  speaker1_name: string | null;
  speaker2_name: string | null;
  speaker1_user_id: string | null;
  speaker2_user_id: string | null;
}

export default function SummaryPage() {
  const router = useRouter();
  const params = useParams();
  const talkId = params.id as string;

  const [talk, setTalk] = useState<Talk | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);
  const [hasShownMapping, setHasShownMapping] = useState(false);

  useEffect(() => {
    fetchTalk();
  }, [talkId]);

  // サマリー生成完了後に話者マッピングダイアログを表示
  useEffect(() => {
    if (
      talk?.summary_status === "generated" &&
      !hasShownMapping &&
      !talk.speaker1_user_id &&
      !talk.speaker2_user_id
    ) {
      setShowSpeakerMapping(true);
      setHasShownMapping(true);
    }
  }, [talk?.summary_status, hasShownMapping, talk?.speaker1_user_id, talk?.speaker2_user_id]);

  useEffect(() => {
    // サマリー生成中の場合、ポーリングで更新を監視
    if (talk?.summary_status === "pending") {
      const interval = setInterval(fetchTalk, 3000);
      return () => clearInterval(interval);
    }
  }, [talk?.summary_status]);

  const fetchTalk = async () => {
    try {
      const res = await fetch(`/api/talks/${talkId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 404) {
        router.push("/talks");
        return;
      }

      const data = await res.json();
      setTalk(data.talk);
    } catch (error) {
      console.error("Error fetching talk:", error);
      toast.error("会話の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const regenerateSummary = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/summary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talkId }),
      });

      if (res.ok) {
        const data = await res.json();
        setTalk((prev) =>
          prev
            ? {
                ...prev,
                summary: data.summary,
                promises: data.promises,
                next_topics: data.nextTopics,
                summary_status: "generated",
              }
            : null
        );
        toast.success("サマリーを再生成しました");
      } else {
        toast.error("サマリーの生成に失敗しました");
      }
    } catch (error) {
      console.error("Error regenerating summary:", error);
      toast.error("サマリーの生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSpeakerName = (speakerTag: number) => {
    if (speakerTag === 1) {
      return talk?.speaker1_name || "話者1";
    }
    return talk?.speaker2_name || "話者2";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!talk) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 基本情報 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">トークサマリー</h1>
          <p className="text-muted-foreground">
            {formatDate(talk.started_at)}
            {talk.duration_minutes && ` (${talk.duration_minutes}分)`}
          </p>
        </div>

        {/* サマリー */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
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
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <line x1="10" x2="8" y1="9" y2="9" />
                </svg>
                要約
              </CardTitle>
              {talk.summary_status === "generated" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateSummary}
                  disabled={isGenerating}
                >
                  {isGenerating ? "生成中..." : "再生成"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {talk.summary_status === "pending" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                サマリーを生成中...
              </div>
            ) : talk.summary_status === "failed" ? (
              <div className="space-y-3">
                <p className="text-destructive">
                  サマリーの生成に失敗しました
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateSummary}
                  disabled={isGenerating}
                >
                  {isGenerating ? "生成中..." : "再試行"}
                </Button>
              </div>
            ) : talk.summary ? (
              <p className="whitespace-pre-wrap">{talk.summary}</p>
            ) : (
              <p className="text-muted-foreground">会話内容がありません</p>
            )}
          </CardContent>
        </Card>

        {/* 約束リスト */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
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
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              約束・決定事項
            </CardTitle>
          </CardHeader>
          <CardContent>
            {talk.promises && talk.promises.length > 0 ? (
              <ul className="space-y-3">
                {talk.promises.map((promise, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p>{promise.content}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getSpeakerName(promise.speaker)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                {talk.summary_status === "pending"
                  ? "生成中..."
                  : "約束・決定事項はありません"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 次回話すこと */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              次回話すこと
            </CardTitle>
          </CardHeader>
          <CardContent>
            {talk.next_topics && talk.next_topics.length > 0 ? (
              <ul className="space-y-2">
                {talk.next_topics.map((topic, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-muted-foreground">-</span>
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                {talk.summary_status === "pending"
                  ? "生成中..."
                  : "次回話すことはありません"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/talks/${talkId}`}>会話内容を見る</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/talks">会話一覧へ</Link>
          </Button>
        </div>

        {/* 話者設定ボタン */}
        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={() => setShowSpeakerMapping(true)}
            className="text-sm text-muted-foreground"
          >
            話者を設定・変更する
          </Button>
        </div>
      </main>

      {/* 話者マッピングダイアログ */}
      <SpeakerMappingDialog
        open={showSpeakerMapping}
        onOpenChange={setShowSpeakerMapping}
        talkId={talkId}
        onMappingComplete={fetchTalk}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/talks" className="flex items-center gap-2">
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
          <span>会話一覧へ戻る</span>
        </Link>
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          Aibond
        </Link>
      </div>
    </header>
  );
}

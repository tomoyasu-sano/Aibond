"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { toast } from "sonner";
// import { TalksOnboarding } from "@/components/onboarding/TalksOnboarding";

interface Talk {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: string;
  summary: string | null;
  summary_status: string | null;
  diarization_status: string | null;
  speaker1_name: string | null;
  speaker2_name: string | null;
}

export default function TalksPage() {
  const router = useRouter();
  const t = useTranslations("talks");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [talks, setTalks] = useState<Talk[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTalks();
  }, []);

  // 処理中または確認待ちの会話がある場合、ポーリング
  useEffect(() => {
    const hasProcessingTalks = talks.some(
      (talk) => talk.status === "completed" &&
        (talk.diarization_status === "pending" || talk.diarization_status === "processing" ||
         talk.summary_status === "pending" || talk.summary_status === "generating")
    );

    // 処理中の会話がある場合、3秒ごとにポーリング（より早いフィードバック）
    if (hasProcessingTalks) {
      const interval = setInterval(fetchTalks, 3000);
      return () => clearInterval(interval);
    }
  }, [talks]);

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
      toast.error(t("fetchFailed"));
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
      toast.error(t("startFailed"));
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

  const getStatusBadge = (talk: Talk) => {
    const { status, summary_status, diarization_status } = talk;

    // 録音待機中（新規作成直後、まだ録音開始していない）
    if (status === "ready") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <span className="w-2 h-2 mr-1 bg-gray-400 rounded-full" />
          待機中
        </span>
      );
    }

    // 録音中
    if (status === "active") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <span className="w-2 h-2 mr-1 bg-red-500 rounded-full animate-pulse" />
          {t("recordingStatus")}
        </span>
      );
    }

    // 一時停止中
    if (status === "paused") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          {t("paused")}
        </span>
      );
    }

    // 話者識別処理中
    if (status === "completed" &&
        (diarization_status === "pending" || diarization_status === "processing")) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <span className="w-3 h-3 mr-1 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          話者識別中...
        </span>
      );
    }

    // サマリー作成中
    if (status === "completed" &&
        (summary_status === "pending" || summary_status === "generating")) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <span className="w-3 h-3 mr-1 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          サマリー作成中...
        </span>
      );
    }

    // 話者識別確認待ち
    if (status === "completed" && summary_status === "waiting_confirmation") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          確認待ち
        </span>
      );
    }

    // 処理失敗
    if (status === "completed" && (diarization_status === "failed" || summary_status === "failed")) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          処理失敗
        </span>
      );
    }

    // 完了済み
    if (status === "completed") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          {t("completed")}
        </span>
      );
    }

    // その他
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSignOut={handleSignOut} t={t} tc={tc} />
        <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
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
      {/* <TalksOnboarding /> */}
      <Header onSignOut={handleSignOut} t={t} tc={tc} />

      <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("pageTitle")}</h1>
            <p className="mt-2 text-muted-foreground text-sm md:text-base">
              {t("pageDescription")}
            </p>
          </div>
          <Button
            onClick={startNewTalk}
            disabled={creating}
            size="lg"
            className="w-full md:w-auto"
            data-onboarding="start-recording"
          >
            {creating ? tc("loading") : t("startNewTalk")}
          </Button>
        </div>

        {talks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {t("noRecords")}
              </p>
              <Button onClick={startNewTalk} disabled={creating}>
                {t("firstConversation")}
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
                      {getStatusBadge(talk)}
                    </div>
                    <CardDescription>
                      {talk.speaker1_name} & {talk.speaker2_name}
                      {talk.duration_minutes && ` • ${talk.duration_minutes}${tc("minute")}`}
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

function Header({ onSignOut, t, tc }: { onSignOut: () => void; t: ReturnType<typeof useTranslations>; tc: ReturnType<typeof useTranslations> }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 md:h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl md:text-2xl font-bold text-primary">{tc("appName")}</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          {/* PC: テキストリンク */}
          <Link href="/dashboard" className="hidden md:block">
            <Button variant="ghost" size="sm">{t("backToDashboard")}</Button>
          </Link>
          <Link href="/settings" className="hidden md:block">
            <Button variant="ghost" size="sm">{tc("settings")}</Button>
          </Link>
          {/* モバイル: ハンバーガーメニュー */}
          <MobileNavMenu />
        </nav>
      </div>
    </header>
  );
}

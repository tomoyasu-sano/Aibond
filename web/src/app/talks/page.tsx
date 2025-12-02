"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
  const t = useTranslations("talks");
  const tc = useTranslations("common");
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <span className="w-2 h-2 mr-1 bg-red-500 rounded-full animate-pulse" />
            {t("recordingStatus")}
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            {t("paused")}
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {t("completed")}
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
      <Header onSignOut={handleSignOut} t={t} tc={tc} />

      <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("pageTitle")}</h1>
            <p className="mt-2 text-muted-foreground text-sm md:text-base">
              {t("pageDescription")}
            </p>
          </div>
          <Button onClick={startNewTalk} disabled={creating} size="lg" className="w-full md:w-auto">
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
                      {getStatusBadge(talk.status)}
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
          <LanguageSwitcher />
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="px-2 md:px-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:hidden">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              <span className="hidden md:inline">{t("backToDashboard")}</span>
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="px-2 md:px-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:hidden">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="hidden md:inline">{tc("settings")}</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

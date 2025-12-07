"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LANGUAGES, type LanguageCode } from "@/types/database";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { Download } from "lucide-react";

interface PartnerData {
  partnership: {
    id: string;
    partnership_name: string | null;
    created_at: string;
  } | null;
  partner: {
    id: string;
    display_name: string | null;
    language: LanguageCode;
  } | null;
}

interface Invitation {
  id: string;
  invite_code: string;
  expires_at: string;
}

export default function PartnersPage() {
  const router = useRouter();
  const t = useTranslations("partners");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PartnerData | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteCompleted, setDeleteCompleted] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    talks: number;
    kizuna_topics: number;
    manual_items: number;
    ai_consultations: number;
  } | null>(null);
  const [isPaidUser, setIsPaidUser] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [partnerRes, inviteRes, profileRes] = await Promise.all([
        fetch("/api/partners"),
        fetch("/api/partners/invite"),
        fetch("/api/profile"),
      ]);

      if (partnerRes.status === 401) {
        router.push("/login");
        return;
      }

      const partnerData = await partnerRes.json();
      const inviteData = await inviteRes.json();
      const profileData = await profileRes.json();

      setData(partnerData);
      setInvitation(inviteData.invitation);
      setIsPaidUser(profileData.subscription?.plan !== "free");
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(t("fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/partners/invite", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setInvitation(data.invitation);
      toast.success(t("inviteCreatedSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("inviteFailed"));
    } finally {
      setCreating(false);
    }
  };

  const cancelInvitation = async () => {
    try {
      await fetch("/api/partners/invite", { method: "DELETE" });
      setInvitation(null);
      toast.success(t("inviteCancelledSuccess"));
    } catch (error) {
      toast.error(t("cancelFailed"));
    }
  };

  const joinPartner = async () => {
    if (!inviteCode.trim()) {
      toast.error(t("noInviteCodeError"));
      return;
    }

    setJoining(true);
    try {
      const res = await fetch("/api/partners/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success(t("linkedSuccess"));
      setInviteCode("");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("linkFailed"));
    } finally {
      setJoining(false);
    }
  };

  const unlinkPartner = async () => {
    setUnlinking(true);
    try {
      const res = await fetch("/api/partners", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success(t("unlinkSuccess"));
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("unlinkFailed"));
    } finally {
      setUnlinking(false);
    }
  };

  const deleteHistory = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/partners/history", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setDeleteResult(data.deleted);
      setDeleting(false);

      // 履歴削除フラグをlocalStorageに設定（ManualContentで検知してカバー画像をリセット）
      localStorage.setItem("aibond_history_deleted", Date.now().toString());
      // カスタムイベントを発火（同一タブ内の他コンポーネント向け）
      window.dispatchEvent(new CustomEvent("aibond:history-deleted"));

      // 全て0件の場合はトーストで通知、それ以外はダイアログ表示
      const totalDeleted = Object.values(data.deleted as Record<string, number>).reduce((a, b) => a + b, 0);
      if (totalDeleted === 0) {
        toast.info(t("noDataToDelete"));
      } else {
        setDeleteCompleted(true);
      }
    } catch (error) {
      setDeleting(false);
      toast.error(error instanceof Error ? error.message : t("deleteFailed"));
    }
  };

  const handleDeleteCompleteClose = () => {
    setDeleteCompleted(false);
    setDeleteResult(null);
    // データを再取得して画面を更新
    fetchData();
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("exportFailed"));
      }

      // JSONファイルをダウンロード
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aibond-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t("exportSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tc("copiedToClipboard"));
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header t={t} tc={tc} onSignOut={handleSignOut} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  const hasPartner = data?.partnership && data?.partner;

  return (
    <div className="min-h-screen bg-background">
      <Header t={t} tc={tc} onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("pageTitle")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>

        {hasPartner ? (
          // Connected state
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("linkedPartner")}</CardTitle>
                <CardDescription>
                  {t("linkedDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("partnerName")}</span>
                  <span className="font-medium">
                    {data.partner?.display_name || "名前未設定"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("language")}</span>
                  <span>
                    {LANGUAGES.find(l => l.code === data.partner?.language)?.nativeName || data.partner?.language}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("linkedDate")}</span>
                  <span>
                    {new Date(data.partnership!.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={unlinking}>
                      {unlinking ? t("unlinkingButton") : t("unlinkButton")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("unlinkPrompt")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("unlinkDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={unlinkPartner}>
                        {t("confirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("historyManagement")}</CardTitle>
                <CardDescription>
                  {t("historyDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("historyHelpText")}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      {t("deleteHistoryButton")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("deleteHistoryPrompt")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("deleteHistoryDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteHistory}>
                        {tc("delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* データエクスポート */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {t("dataExport")}
                </CardTitle>
                <CardDescription>
                  {t("dataExportDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPaidUser ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("dataExportHelpText")}
                    </p>
                    <Button
                      onClick={exportData}
                      disabled={exporting}
                      className="w-full md:w-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {exporting ? t("exportingButton") : t("exportButton")}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("dataExportPaidOnly")}
                    </p>
                    <Link href="/plans" className="block pt-4">
                      <Button variant="outline" className="w-full md:w-auto">
                        {t("upgradePlan")}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Not connected state
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("invitePartner")}</CardTitle>
                <CardDescription>
                  {t("inviteDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {invitation ? (
                  <>
                    <div className="space-y-2">
                      <Label>{t("inviteCode")}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={invitation.invite_code}
                          readOnly
                          className="font-mono text-lg tracking-wider"
                        />
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(invitation.invite_code)}
                        >
                          {tc("copy")}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("expiresAt")}: {new Date(invitation.expires_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={cancelInvitation}
                      className="w-full"
                    >
                      {t("cancelInvite")}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={createInvitation}
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? t("creatingInviteButton") : t("createInviteButton")}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("joinWithCode")}</CardTitle>
                <CardDescription>
                  {t("joinDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">{t("inviteCode")}</Label>
                  <Input
                    id="inviteCode"
                    placeholder={t("joinPlaceholder")}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="font-mono text-lg tracking-wider"
                  />
                </div>
                <Button
                  onClick={joinPartner}
                  disabled={joining || !inviteCode.trim()}
                  className="w-full"
                >
                  {joining ? t("joiningButton") : t("joinButton")}
                </Button>
              </CardContent>
            </Card>

            {/* History deletion for unlinked partnerships */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t("unlinkedPartnerHistory")}</CardTitle>
                <CardDescription>
                  {t("unlinkedHistoryDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      {t("deleteHistoryButton")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("deleteHistoryPrompt")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("deleteHistoryDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteHistory}>
                        {tc("delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* データエクスポート */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {t("dataExport")}
                </CardTitle>
                <CardDescription>
                  {t("dataExportDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPaidUser ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("dataExportHelpText")}
                    </p>
                    <Button
                      onClick={exportData}
                      disabled={exporting}
                      className="w-full md:w-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {exporting ? t("exportingButton") : t("exportButton")}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("dataExportPaidOnly")}
                    </p>
                    <Link href="/plans" className="block pt-4">
                      <Button variant="outline" className="w-full md:w-auto">
                        {t("upgradePlan")}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* 削除処理中ダイアログ */}
      <Dialog open={deleting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
              {t("deletingTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("deletingDescription")}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* 削除完了ダイアログ */}
      <Dialog open={deleteCompleted} onOpenChange={handleDeleteCompleteClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {t("deleteCompletedTitle")}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p>{t("deleteCompletedDescription")}</p>
                {deleteResult && (
                  <ul className="text-sm space-y-1 bg-muted p-3 rounded-md">
                    <li>{t("deletedTalks")}: {t("itemCount", { count: deleteResult.talks })}</li>
                    <li>{t("deletedKizunaTopics")}: {t("itemCount", { count: deleteResult.kizuna_topics })}</li>
                    <li>{t("deletedManualItems")}: {t("itemCount", { count: deleteResult.manual_items })}</li>
                    <li>{t("deletedAiConsultations")}: {t("itemCount", { count: deleteResult.ai_consultations })}</li>
                  </ul>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={handleDeleteCompleteClose}>
              {t("closeButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header({ t, tc, onSignOut }: { t: any; tc: any; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{tc("appName")}</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          <Link href="/dashboard" className="hidden md:block">
            <Button variant="ghost" size="sm">{tc("dashboard")}</Button>
          </Link>
          <Link href="/settings" className="hidden md:block">
            <Button variant="ghost" size="sm">{tc("settings")}</Button>
          </Link>
          <MobileNavMenu />
        </nav>
      </div>
    </header>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import { LANGUAGES, PLAN_LIMITS, type LanguageCode, type PlanType } from "@/types/database";

interface ProfileData {
  profile: {
    id: string;
    display_name: string | null;
    language: LanguageCode;
  };
  subscription: {
    plan: PlanType;
    cancel_at_period_end?: boolean;
    current_period_end?: string;
  };
  usage: {
    minutes_used: number;
    minutes_limit: number;
  };
  partnership: {
    id: string;
    partnership_name: string | null;
  } | null;
  partner: {
    id: string;
    display_name: string | null;
    language: string;
  } | null;
  email: string;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingPortal, setProcessingPortal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [data, setData] = useState<ProfileData | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("ja");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    // Checkout成功時のメッセージ
    if (searchParams.get("checkout") === "success") {
      toast.success(t("checkoutSuccess"));
      // URLパラメータを削除
      router.replace("/settings");
    }
    fetchProfile();
  }, [searchParams, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch profile");
      }
      const profileData = await res.json();
      setData(profileData);
      setDisplayName(profileData.profile.display_name || "");
      setLanguage(profileData.profile.language || "ja");
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error(t("fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || null,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      toast.success(t("saveSuccess"));
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleManageSubscription = async () => {
    setProcessingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error(t("portalFailed"));
      setProcessingPortal(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "削除する") {
      toast.error(t("deleteConfirmMismatch"));
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete account");
      }

      toast.success(t("deleteSuccess"));

      // ログアウトしてトップページへ
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(t("deleteFailed"));
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header t={t} tc={tc} email={null} onSignOut={handleSignOut} />
        <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Header t={t} tc={tc} email={null} onSignOut={handleSignOut} />
        <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
          <p>{t("fetchFailed")}</p>
        </main>
      </div>
    );
  }

  const planLimit = PLAN_LIMITS[data.subscription.plan];
  const usagePercent = planLimit.minutes === -1
    ? 0
    : Math.round((data.usage.minutes_used / planLimit.minutes) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Header t={t} tc={tc} email={data.email} onSignOut={handleSignOut} />

      <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">{t("pageTitle")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("profile")}</CardTitle>
              <CardDescription>
                {t("profileDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("displayName")}</Label>
                <Input
                  id="displayName"
                  placeholder={t("displayNamePlaceholder")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("displayNameHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">{t("language")}</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("languageHint")}
                </p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label>{t("displayLanguage")}</Label>
                <LanguageSwitcher />
                <p className="text-xs text-muted-foreground">
                  {t("displayLanguageHint")}
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? t("savingButton") : t("saveButton")}
              </Button>
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t("planInfo")}</CardTitle>
              <CardDescription>
                {t("planDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("currentPlan")}</span>
                <span className="font-medium capitalize">{data.subscription.plan}</span>
              </div>

              {data.subscription.cancel_at_period_end && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {t("cancelScheduled", {
                      date: data.subscription.current_period_end
                        ? new Date(data.subscription.current_period_end).toLocaleDateString()
                        : ""
                    })}
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("currentMonthUsage")}</span>
                  <span>
                    {data.usage.minutes_used}{tc("minute")}
                    {planLimit.minutes !== -1 && ` / ${planLimit.minutes}${tc("minute")}`}
                  </span>
                </div>
                {planLimit.minutes !== -1 && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {data.subscription.plan === "free" ? (
                <Link href="/plans">
                  <Button className="w-full">
                    {t("upgradeButton")}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={processingPortal}
                >
                  {processingPortal ? tc("loading") : t("manageSubscription")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Partner Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t("partnerLink")}</CardTitle>
              <CardDescription>
                {t("partnerLinkDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.partnership && data.partner ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("partnerName")}</span>
                    <span className="font-medium">
                      {data.partner.display_name || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("language")}</span>
                    <span>
                      {LANGUAGES.find(l => l.code === data.partner?.language)?.nativeName || data.partner.language}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    {t("notLinked")}
                  </p>
                  <Link href="/partners">
                    <Button variant="outline">
                      {t("inviteButton")}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t("account")}</CardTitle>
              <CardDescription>
                {t("accountDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("emailAddress")}</span>
                <span className="text-sm">{data.email}</span>
              </div>

              <Separator />

              <Button variant="destructive" onClick={handleSignOut} className="w-full">
                {t("logoutButton")}
              </Button>

              <Separator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                    {t("deleteAccount")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("deletePrompt")}</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        {t("deleteDescription")}
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>{t("deleteList1")}</li>
                        <li>{t("deleteList2")}</li>
                        <li>{t("deleteList3")}</li>
                      </ul>
                      <p className="text-sm text-muted-foreground">
                        {t("deleteNote")}
                      </p>
                      <div className="pt-2">
                        <Label htmlFor="deleteConfirm" className="text-sm font-medium">
                          {t("confirmDelete")}
                        </Label>
                        <Input
                          id="deleteConfirm"
                          className="mt-2"
                          placeholder={t("confirmDeletePlaceholder")}
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
                      {tc("cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== t("confirmDeletePlaceholder") || deletingAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deletingAccount ? t("deletingButton") : t("deleteButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Legal Links */}
          <Card>
            <CardHeader>
              <CardTitle>{t("legalInfo")}</CardTitle>
              <CardDescription>
                {t("legalDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/terms" className="block">
                <Button variant="ghost" className="w-full justify-start">
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  {t("termsOfService")}
                </Button>
              </Link>
              <Link href="/privacy" className="block">
                <Button variant="ghost" className="w-full justify-start">
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
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  {t("privacyPolicy")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <LoadingOverlay open={processingPortal} message={tc("loading")} />
    </div>
  );
}

function Header({ t, tc, email, onSignOut }: { t: ReturnType<typeof useTranslations>; tc: ReturnType<typeof useTranslations>; email: string | null; onSignOut: () => void }) {
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
          {email && (
            <span className="hidden md:inline text-sm text-muted-foreground">{email}</span>
          )}
        </nav>
      </div>
    </header>
  );
}

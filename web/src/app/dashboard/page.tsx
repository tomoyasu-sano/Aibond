import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ensureCurrentPeriodUsage } from "@/lib/usage/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LIMITS, type PlanType } from "@/types/database";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { SentimentCard } from "@/components/dashboard/SentimentCard";
import { ManualCard } from "@/components/dashboard/ManualCard";
import { DashboardOnboarding } from "@/components/onboarding/DashboardOnboarding";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");

  // Get user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // 月初リセット: 新しい月のアクセス時にusageレコードを自動作成
  await ensureCurrentPeriodUsage(supabase, user.id);

  // Get current month usage
  const period = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", user.id)
    .eq("period", period)
    .single();

  // Get partnership
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  const plan = (subscription?.plan || "free") as PlanType;
  const planLimit = PLAN_LIMITS[plan];
  const minutesUsed = usage?.minutes_used || 0;
  const usagePercent = planLimit.minutes > 0 ? Math.round((minutesUsed / planLimit.minutes) * 100) : 0;
  const remainingMinutes = Math.max(0, planLimit.minutes - minutesUsed);

  return (
    <div className="min-h-screen bg-background">
      {/* オンボーディング */}
      <DashboardOnboarding />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 md:h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl md:text-2xl font-bold text-primary">{tc("appName")}</span>
          </Link>
          <nav className="flex items-center gap-2 md:gap-4">
            <Link href="/settings" className="hidden md:block">
              <Button variant="ghost" size="sm">{tc("settings")}</Button>
            </Link>
            <span className="hidden md:inline text-sm text-muted-foreground">
              {profile?.display_name || user.email}
            </span>
            <MobileNavMenu />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto px-4 py-6 pb-24 md:py-8 md:pb-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">ホーム</h1>
          <p className="mt-2 text-muted-foreground">
            {t("welcomeMessage", { name: profile?.display_name || "" })}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 1. 会話を始める */}
          <Card data-onboarding="start-conversation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
                {t("startConversation")}
              </CardTitle>
              <CardDescription>
                {t("newConversationDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/talks">
                <Button className="w-full">
                  {t("startConversation")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 2. 絆ノート */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                {t("bondNote")}
              </CardTitle>
              <CardDescription>
                {t("bondNoteDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {await (async () => {
                // パートナーシップがある場合は見直し時期のアラートを表示
                if (partnership) {
                  const today = new Date();
                  const sevenDaysLater = new Date(today);
                  sevenDaysLater.setDate(today.getDate() + 7);
                  const sevenDaysLaterStr = sevenDaysLater.toISOString().split("T")[0];

                  const { count } = await supabase
                    .from("kizuna_items")
                    .select("id, topic:kizuna_topics!inner(partnership_id)", { count: "exact", head: true })
                    .eq("status", "active")
                    .eq("kizuna_topics.partnership_id", partnership.id)
                    .not("review_date", "is", null)
                    .lte("review_date", sevenDaysLaterStr);

                  const reviewDueCount = count || 0;

                  if (reviewDueCount > 0) {
                    return (
                      <div className="mb-4 px-3 py-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                          </svg>
                          <span className="font-medium">見直し時期が近い項目: {reviewDueCount}件</span>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
              <Link href="/kizuna">
                <Button variant="outline" className="w-full">
                  {t("openBondNote")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 3. 取説 */}
          <ManualCard userId={user.id} partnershipId={partnership?.id} />

          {/* 4. AI相談 */}
          <Card className={plan === "free" ? "relative overflow-hidden" : ""}>
            {plan === "free" && (
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  有料
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={plan === "free" ? "text-muted-foreground" : "text-primary"}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span className={plan === "free" ? "text-muted-foreground" : ""}>{t("aiConsultation")}</span>
              </CardTitle>
              <CardDescription>
                {t("aiConsultationDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {plan === "free" ? (
                <Link href="/plans">
                  <Button variant="outline" className="w-full gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    {t("upgradeButtonText")}
                  </Button>
                </Link>
              ) : (
                <Link href="/ai-chat">
                  <Button variant="outline" className="w-full">
                    {t("consult")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* 5. 話し合い分析 */}
          <SentimentCard />

          {/* 6. パートナー連携 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {t("partnerLink")}
              </CardTitle>
              <CardDescription>
                {partnership ? t("partnerLinkConnected") : t("partnerLinkDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/partners">
                <Button variant="outline" className="w-full">
                  {partnership ? t("viewLinkStatus") : t("invitePartner")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Status Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t("accountStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("plan")}</span>
                <span className="font-medium capitalize">{plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("partnerLinkStatus")}</span>
                <span className="font-medium">
                  {partnership ? t("linked") : t("notLinked")}
                </span>
              </div>

              {/* 使用量セクション */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("currentMonthUsage")}</span>
                  <span className="font-medium">
                    {t("usageFormat", { used: minutesUsed, limit: planLimit.minutes !== -1 ? planLimit.minutes : tc("unlimited") })}
                  </span>
                </div>

                {/* プログレスバー */}
                {planLimit.minutes !== -1 && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        usagePercent >= 100
                          ? "bg-red-500"
                          : usagePercent >= 80
                          ? "bg-yellow-500"
                          : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                )}

                {/* 警告メッセージ */}
                {planLimit.minutes !== -1 && usagePercent >= 100 && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mt-2">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {t("limitReached")}
                    </p>
                    <Link href="/plans" className="inline-block mt-2">
                      <Button size="sm" variant="destructive">
                        {t("upgradeButtonText")}
                      </Button>
                    </Link>
                  </div>
                )}

                {planLimit.minutes !== -1 && usagePercent >= 80 && usagePercent < 100 && (
                  <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 mt-2">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {t("remainingMinutes", { minutes: remainingMinutes })}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  {t("openSettings")}
                </Button>
              </Link>
              {plan === "free" && (
                <Link href="/plans">
                  <Button size="sm">
                    {t("upgradeButtonText")}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

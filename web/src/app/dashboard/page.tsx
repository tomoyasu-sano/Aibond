import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureCurrentPeriodUsage } from "@/lib/usage/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LIMITS, type PlanType } from "@/types/database";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Aibond</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                設定
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {profile?.display_name || user.email}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                ログアウト
              </Button>
            </form>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">ダッシュボード</h1>
          <p className="mt-2 text-muted-foreground">
            {profile?.display_name
              ? `${profile.display_name}さん、`
              : ""}
            Aibondへようこそ。2人のコミュニケーションを始めましょう。
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
                会話を始める
              </CardTitle>
              <CardDescription>
                新しい会話を記録・翻訳します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/talks">
                <Button className="w-full">
                  会話を始める
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                パートナー連携
              </CardTitle>
              <CardDescription>
                {partnership ? "パートナーと連携中" : "パートナーを招待して連携します"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/partners">
                <Button variant="outline" className="w-full">
                  {partnership ? "連携状況を見る" : "パートナーを招待"}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                絆ノート
              </CardTitle>
              <CardDescription>
                二人の約束・習慣・要望を記録
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/kizuna">
                <Button variant="outline" className="w-full">
                  絆ノートを開く
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                AI相談
              </CardTitle>
              <CardDescription>
                パートナーとの関係についてAIに相談
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/ai-chat">
                <Button variant="outline" className="w-full">
                  相談する
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Status Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>アカウント状態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">プラン</span>
                <span className="font-medium capitalize">{plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">パートナー連携</span>
                <span className="font-medium">
                  {partnership ? "連携済み" : "未連携"}
                </span>
              </div>

              {/* 使用量セクション */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">今月の利用時間</span>
                  <span className="font-medium">
                    {minutesUsed}分
                    {planLimit.minutes !== -1 && ` / ${planLimit.minutes}分`}
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
                      今月の利用時間の上限に達しました。新しいトークを開始するには、プランのアップグレードをご検討ください。
                    </p>
                    <Link href="/plans" className="inline-block mt-2">
                      <Button size="sm" variant="destructive">
                        プランをアップグレード
                      </Button>
                    </Link>
                  </div>
                )}

                {planLimit.minutes !== -1 && usagePercent >= 80 && usagePercent < 100 && (
                  <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 mt-2">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      残り{remainingMinutes}分です。プランのアップグレードをご検討ください。
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  設定を開く
                </Button>
              </Link>
              {plan === "free" && (
                <Link href="/plans">
                  <Button size="sm">
                    プランをアップグレード
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

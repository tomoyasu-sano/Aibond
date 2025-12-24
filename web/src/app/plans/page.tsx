"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { toast } from "sonner";
import { PLAN_LIMITS, type PlanType } from "@/types/database";

const PLANS = [
  {
    key: "free" as const,
    name: "Free",
    price: 0,
    description: "お試しに最適",
    features: [
      "月1時間まで利用可能",
      "リアルタイム文字起こし",
      "翻訳機能",
      "AIサマリー",
    ],
    buttonText: "現在のプラン",
    popular: false,
  },
  {
    key: "light" as const,
    name: "ライト",
    price: 1280,
    description: "週1回の会話に",
    features: [
      "月5時間まで利用可能",
      "リアルタイム文字起こし",
      "翻訳機能",
      "AIサマリー",
      "約束リスト",
      "AI相談チャット",
    ],
    buttonText: "このプランを選択",
    popular: false,
  },
  {
    key: "standard" as const,
    name: "スタンダード",
    price: 1980,
    description: "週2-3回の会話に",
    features: [
      "月10時間まで利用可能",
      "リアルタイム文字起こし",
      "翻訳機能",
      "AIサマリー",
      "約束リスト",
      "AI相談チャット",
    ],
    buttonText: "このプランを選択",
    popular: true,
  },
  {
    key: "premium" as const,
    name: "プレミアム",
    price: 2980,
    description: "毎日通話するカップルに",
    features: [
      "月25時間まで利用可能",
      "リアルタイム文字起こし",
      "翻訳機能",
      "AIサマリー",
      "約束リスト",
      "AI相談チャット",
      "優先サポート",
    ],
    buttonText: "このプランを選択",
    popular: false,
  },
];

export default function PlansPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded mx-auto" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    }>
      <PlansContent />
    </Suspense>
  );
}

function PlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("plans");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // キャンセル時のメッセージ
    if (searchParams.get("checkout") === "canceled") {
      toast.info(t("checkoutCancelled"));
    }

    fetchCurrentPlan();
  }, [searchParams]);

  const fetchCurrentPlan = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setCurrentPlan(data.subscription?.plan || "free");
    } catch (error) {
      console.error("Error fetching plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planKey: "light" | "standard" | "premium") => {
    setProcessing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, locale }),
      });

      if (!res.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error(t("checkoutFailed"));
      setProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setProcessing(true);
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
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header t={t} tc={tc} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 w-48 bg-muted rounded mx-auto" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-96 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header t={t} tc={tc} />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t("pageTitle")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isUpgrade =
              (currentPlan === "free" && plan.key !== "free") ||
              (currentPlan === "light" && (plan.key === "standard" || plan.key === "premium")) ||
              (currentPlan === "standard" && plan.key === "premium");
            const isDowngrade =
              (currentPlan === "premium" && (plan.key === "standard" || plan.key === "light")) ||
              (currentPlan === "standard" && plan.key === "light") ||
              (currentPlan !== "free" && plan.key === "free");

            return (
              <Card
                key={plan.key}
                className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      人気
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/月</span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
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
                          className="text-primary"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t("currentPlan")}
                    </Button>
                  ) : plan.key === "free" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManageSubscription}
                      disabled={currentPlan === "free"}
                    >
                      {currentPlan === "free" ? t("currentPlan") : t("changePlan")}
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleSelectPlan(plan.key as "light" | "standard" | "premium")}
                    >
                      {t("upgrade")}
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManageSubscription}
                    >
                      {t("changePlan")}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleSelectPlan(plan.key as "light" | "standard" | "premium")}
                    >
                      {t("selectPlan")}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {currentPlan !== "free" && (
          <div className="text-center mt-8">
            <Button variant="link" onClick={handleManageSubscription}>
              {t("manageSubscription")}
            </Button>
          </div>
        )}
      </main>

      <LoadingOverlay open={processing} message={tc("loading")} />
    </div>
  );
}

function Header({ t, tc }: { t: any; tc: any }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{tc("appName")}</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              {tc("dashboard")}
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              {tc("settings")}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

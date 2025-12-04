"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";

export default function TokushohoPage() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const t = useTranslations("tokushoho");
    const tc = useTranslations("common");

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setIsLoggedIn(!!user);
        };
        checkAuth();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">{tc("appName")}</span>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <LanguageSwitcher />
                        {isLoggedIn === null ? null : isLoggedIn ? (
                            <>
                                <Link href="/dashboard">
                                    <Button variant="ghost" size="sm">
                                        {t("dashboard")}
                                    </Button>
                                </Link>
                                <Link href="/settings">
                                    <Button variant="ghost" size="sm">
                                        {t("settings")}
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">
                                        {t("login")}
                                    </Button>
                                </Link>
                                <Link href="/signup">
                                    <Button size="sm">{t("getStarted")}</Button>
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <h1 className="text-3xl font-bold mb-8">{t("pageTitle")}</h1>

                <div className="prose prose-gray max-w-none space-y-6">
                    <p className="text-muted-foreground">
                        {t("lastUpdated")}
                    </p>

                    <table className="w-full border-collapse">
                        <tbody className="text-muted-foreground">
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30 w-1/3">{t("seller")}</th>
                                <td className="py-3 px-4">{t("sellerValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("representative")}</th>
                                <td className="py-3 px-4">{t("representativeValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("address")}</th>
                                <td className="py-3 px-4">{t("addressValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("contact")}</th>
                                <td className="py-3 px-4">{t("contactValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("price")}</th>
                                <td className="py-3 px-4">
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>{t("priceFree")}</li>
                                        <li>{t("priceStandard")}</li>
                                        <li>{t("pricePremium")}</li>
                                    </ul>
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("paymentMethod")}</th>
                                <td className="py-3 px-4">{t("paymentMethodValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("paymentTiming")}</th>
                                <td className="py-3 px-4">{t("paymentTimingValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("serviceStart")}</th>
                                <td className="py-3 px-4">{t("serviceStartValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("cancellation")}</th>
                                <td className="py-3 px-4">{t("cancellationValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("refund")}</th>
                                <td className="py-3 px-4">{t("refundValue")}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="py-3 px-4 text-left font-semibold bg-muted/30">{t("operatingEnv")}</th>
                                <td className="py-3 px-4">{t("operatingEnvValue")}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-12 pt-8 border-t flex gap-4">
                    {isLoggedIn ? (
                        <Link href="/settings">
                            <Button variant="outline">{t("backToSettings")}</Button>
                        </Link>
                    ) : (
                        <Link href="/signup">
                            <Button>{t("backToSignup")}</Button>
                        </Link>
                    )}
                    <Link href="/terms">
                        <Button variant="ghost">{t("termsLink")}</Button>
                    </Link>
                    <Link href="/privacy">
                        <Button variant="ghost">{t("privacyLink")}</Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}

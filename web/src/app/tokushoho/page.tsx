"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MobileNavMenu } from "@/components/MobileNavMenu";

export default function TokushohoPage() {
    const t = useTranslations("tokushoho");
    const tc = useTranslations("common");

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <span className="text-xl font-bold text-primary">{tc("appName")}</span>
                    </Link>
                    <MobileNavMenu />
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <h1 className="text-3xl font-bold mb-8">{t("pageTitle")}</h1>

                <div className="prose prose-gray max-w-none space-y-6">
                    <p className="text-muted-foreground">
                        {t("lastUpdated")}
                    </p>

                    <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[500px]">
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
                </div>

                <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <Link href="/settings">
                        <Button variant="outline" className="w-full sm:w-auto">{t("backToSettings")}</Button>
                    </Link>
                    <Link href="/terms">
                        <Button variant="ghost" className="w-full sm:w-auto">{t("termsLink")}</Button>
                    </Link>
                    <Link href="/privacy">
                        <Button variant="ghost" className="w-full sm:w-auto">{t("privacyLink")}</Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}

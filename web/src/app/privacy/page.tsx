"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";

export default function PrivacyPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const t = useTranslations("privacy");
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

        <div className="prose prose-gray max-w-none space-y-8">
          <p className="text-muted-foreground">
            {t("lastUpdated")}
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section1Title")}</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>{t("section1Content1")}</p>
              <p>{t("section1Content2")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section2Title")}</h2>
            <div className="space-y-4 text-muted-foreground">
              <p><strong>{t("section2_1Title")}</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("section2_1Item1")}</li>
                <li>{t("section2_1Item2")}</li>
                <li>{t("section2_1Item3")}</li>
              </ul>

              <p><strong>{t("section2_2Title")}</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("section2_2Item1")}</li>
                <li>{t("section2_2Item2")}</li>
                <li>{t("section2_2Item3")}</li>
                <li>{t("section2_2Item4")}</li>
                <li>{t("section2_2Item5")}</li>
              </ul>

              <p><strong>{t("section2_3Title")}</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("section2_3Item1")}</li>
                <li>{t("section2_3Item2")}</li>
              </ul>

              <p><strong>{t("section2_4Title")}</strong></p>
              <p>{t("section2_4Content")}</p>
            </div>
          </section>

          <section className="border-l-4 border-primary pl-4 bg-muted/30 p-4 rounded">
            <h2 className="text-xl font-semibold mb-4">{t("section3Title")}</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>{t("section3Intro")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("section3Item1")}</li>
                <li>{t("section3Item2")}</li>
                <li>{t("section3Item3")}</li>
                <li>{t("section3Item4")}</li>
                <li>{t("section3Item5")}</li>
                <li>{t("section3Item6")}</li>
                <li>{t("section3Item7")}</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section4Title")}</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("section4Intro")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Google Cloud Speech-to-Text</strong>: {t("section4Item1").split(": ")[1]}</li>
                <li><strong>Google Cloud Translation</strong>: {t("section4Item2").split(": ")[1]}</li>
                <li><strong>Google Gemini</strong>: {t("section4Item3").split(": ")[1]}</li>
                <li><strong>Stripe</strong>: {t("section4Item4").split(": ")[1]}</li>
                <li><strong>Supabase</strong>: {t("section4Item5").split(": ")[1]}</li>
              </ul>

              <p><strong>{t("section4_1Title")}</strong></p>
              <p>{t("section4_1Content")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section5Title")}</h2>
            <div className="space-y-4 text-muted-foreground">
              <p><strong>{t("section5_1Title")}</strong></p>
              <p>{t("section5_1Content")}</p>

              <p><strong>{t("section5_2Title")}</strong></p>
              <p>{t("section5_2Content")}</p>

              <p><strong>{t("section5_3Title")}</strong></p>
              <p>{t("section5_3Content")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section6Title")}</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>{t("section6Intro")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>{t("section6Item1").split(":")[0]}</strong>: {t("section6Item1").split(": ")[1]}</li>
                <li><strong>{t("section6Item2").split(":")[0]}</strong>: {t("section6Item2").split(": ")[1]}</li>
                <li><strong>{t("section6Item3").split(":")[0]}</strong>: {t("section6Item3").split(": ")[1]}</li>
                <li><strong>{t("section6Item4").split(":")[0]}</strong>: {t("section6Item4").split(": ")[1]}</li>
              </ul>

              <p><strong>{t("section6CompleteTitle")}</strong></p>
              <p>{t("section6CompleteContent")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section7Title")}</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>{t("section7Intro")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("section7Item1")}</li>
                <li>{t("section7Item2")}</li>
                <li>{t("section7Item3")}</li>
                <li>{t("section7Item4")}</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section8Title")}</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>{t("section8Intro")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("section8Item1")}</li>
                <li>{t("section8Item2")}</li>
                <li>{t("section8Item3")}</li>
              </ul>
              <p>{t("section8Content")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section9Title")}</h2>
            <p className="text-muted-foreground">
              {t("section9Content")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("section10Title")}</h2>
            <p className="text-muted-foreground">
              {t("section10Content")}
            </p>
          </section>
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
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MobileNavMenu } from "@/components/MobileNavMenu";

export default function TermsPage() {
  const t = useTranslations("terms");
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

        <div className="prose prose-gray max-w-none space-y-8">
          <p className="text-muted-foreground">
            {t("lastUpdated")}
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article1Title")}</h2>
            <p className="text-muted-foreground">
              {t("article1Content")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article2Title")}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("article2Item1")}</li>
              <li>{t("article2Item2")}</li>
              <li>{t("article2Item3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article3Title")}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("article3Item1")}</li>
              <li>{t("article3Item2")}</li>
              <li>{t("article3Item3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article4Title")}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("article4Item1")}</li>
              <li>{t("article4Item2")}</li>
              <li>{t("article4Item3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article5Title")}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("article5Item1")}</li>
              <li>{t("article5Item2")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article6Title")}</h2>
            <p className="text-muted-foreground">
              {t("article6Content")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article7Title")}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("article7Item1")}</li>
              <li>{t("article7Item2")}</li>
              <li>{t("article7Item3")}</li>
              <li>{t("article7Item4")}</li>
              <li>{t("article7Item5")}</li>
              <li>{t("article7Item6")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article8Title")}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("article8Item1")}</li>
              <li>{t("article8Item2")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article9Title")}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("article9Item1")}</li>
              <li>{t("article9Item2")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("article10Title")}</h2>
            <p className="text-muted-foreground">
              {t("article10Content")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">{t("supplementTitle")}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>{t("supplementItem1")}</li>
              <li>{t("supplementItem2")}</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Link href="/settings">
            <Button variant="outline" className="w-full sm:w-auto">{t("backToSettings")}</Button>
          </Link>
          <Link href="/privacy">
            <Button variant="ghost" className="w-full sm:w-auto">{t("privacyLink")}</Button>
          </Link>
          <Link href="/tokushoho">
            <Button variant="ghost" className="w-full sm:w-auto">{t("tokushohoLink")}</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

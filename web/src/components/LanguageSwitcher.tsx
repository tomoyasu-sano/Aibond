"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { locales, localeNames, type Locale } from "@/config/locales";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 短い言語コード表示用
const localeShortNames: Record<Locale, string> = {
  ja: "JA",
  en: "EN",
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: string) => {
    startTransition(() => {
      // Set cookie for locale
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
      // Reload the page to apply new locale
      window.location.reload();
    });
  };

  return (
    <div className={className}>
      {/* PC: フル表示 */}
      <div className="hidden md:block">
        <Select value={locale} onValueChange={handleChange} disabled={isPending}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locales.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {localeNames[loc as Locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* スマホ: コンパクト表示 */}
      <div className="block md:hidden">
        <Select value={locale} onValueChange={handleChange} disabled={isPending}>
          <SelectTrigger className="w-auto gap-1 px-2">
            <Globe className="h-4 w-4" />
            <span className="text-xs">{localeShortNames[locale as Locale]}</span>
          </SelectTrigger>
          <SelectContent>
            {locales.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {localeNames[loc as Locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

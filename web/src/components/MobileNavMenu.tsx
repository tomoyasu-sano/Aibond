"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Menu, Home, Mic, Heart, BookOpen, MessageSquare, BarChart3, Users, Settings, LucideIcon } from "lucide-react";

type MenuItemKey = "menuHome" | "menuTalks" | "menuKizuna" | "menuManual" | "menuAiChat" | "menuAnalytics" | "menuPartners" | "menuSettings";

const menuItems: { href: string; labelKey: MenuItemKey; icon: LucideIcon }[] = [
  { href: "/dashboard", labelKey: "menuHome", icon: Home },
  { href: "/talks", labelKey: "menuTalks", icon: Mic },
  { href: "/kizuna", labelKey: "menuKizuna", icon: Heart },
  { href: "/manual", labelKey: "menuManual", icon: BookOpen },
  { href: "/ai-chat", labelKey: "menuAiChat", icon: MessageSquare },
  { href: "/analytics", labelKey: "menuAnalytics", icon: BarChart3 },
  { href: "/partners", labelKey: "menuPartners", icon: Users },
  { href: "/settings", labelKey: "menuSettings", icon: Settings },
];

export function MobileNavMenu() {
  const t = useTranslations("common");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="md:hidden relative">
      <Button
        variant="ghost"
        size="sm"
        className="px-2"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <Menu size={20} />
      </Button>

      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg z-50 py-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <Icon size={18} />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

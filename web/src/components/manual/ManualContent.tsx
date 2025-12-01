"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookshelf } from "@/components/manual/Bookshelf";
import type { ManualItem } from "@/types/manual";

interface Partner {
  id: string;
  name: string;
}

interface ManualContentProps {
  userId: string;
  userName: string;
  partner: Partner | null;
  partnershipId?: string;
}

export function ManualContent({
  userId,
  userName,
  partner,
  partnershipId,
}: ManualContentProps) {
  const t = useTranslations("manual");
  const [myItems, setMyItems] = useState<ManualItem[]>([]);
  const [partnerItems, setPartnerItems] = useState<ManualItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 自分の取説を取得
  useEffect(() => {
    async function fetchMyItems() {
      try {
        const res = await fetch(`/api/manual?target_user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setMyItems(data.items);
        }
      } catch (error) {
        console.error("Error fetching my items:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyItems();
  }, [userId]);

  // パートナーの取説を取得
  useEffect(() => {
    if (!partner) return;

    async function fetchPartnerItems() {
      try {
        const res = await fetch(`/api/manual?target_user_id=${partner.id}`);
        if (res.ok) {
          const data = await res.json();
          setPartnerItems(data.items);
        }
      } catch (error) {
        console.error("Error fetching partner items:", error);
      }
    }

    fetchPartnerItems();
  }, [partner]);

  const handleItemAdded = (item: ManualItem) => {
    if (item.target_user_id === userId) {
      setMyItems((prev) => [...prev, item]);
    } else if (partner && item.target_user_id === partner.id) {
      setPartnerItems((prev) => [...prev, item]);
    }
  };

  const handleItemUpdated = (item: ManualItem) => {
    if (item.target_user_id === userId) {
      setMyItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    } else if (partner && item.target_user_id === partner.id) {
      setPartnerItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    }
  };

  const handleItemDeleted = (itemId: string, targetUserId: string) => {
    if (targetUserId === userId) {
      setMyItems((prev) => prev.filter((i) => i.id !== itemId));
    } else if (partner && targetUserId === partner.id) {
      setPartnerItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 md:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← {t("backToDashboard")}
              </Button>
            </Link>
          </div>
          <h1 className="text-xl md:text-2xl font-bold">📖 {t("pageTitle")}</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
        <p className="text-center text-muted-foreground mb-6">
          {t("pageDescription")}
        </p>

        {/* PC: 左右2カラム、スマホ: タブ切り替え */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8">
          {/* 左: 自分の本棚 */}
          <Bookshelf
            title={t("myManual")}
            items={myItems}
            targetUserId={userId}
            currentUserId={userId}
            partnershipId={partnershipId}
            loading={loading}
            onItemAdded={handleItemAdded}
            onItemUpdated={handleItemUpdated}
            onItemDeleted={handleItemDeleted}
          />

          {/* 右: パートナーの本棚 */}
          {partner && (
            <Bookshelf
              title={t("partnerManual", { name: partner.name })}
              items={partnerItems}
              targetUserId={partner.id}
              currentUserId={userId}
              partnershipId={partnershipId}
              loading={loading}
              onItemAdded={handleItemAdded}
              onItemUpdated={handleItemUpdated}
              onItemDeleted={handleItemDeleted}
            />
          )}
        </div>

        {/* スマホ: タブ切り替え */}
        <div className="lg:hidden">
          <Tabs defaultValue="my" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my">👤 {t("myManual")}</TabsTrigger>
              {partner && (
                <TabsTrigger value="partner">
                  💕 {partner.name}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my" className="mt-6">
              <Bookshelf
                title={t("myManual")}
                items={myItems}
                targetUserId={userId}
                currentUserId={userId}
                partnershipId={partnershipId}
                loading={loading}
                onItemAdded={handleItemAdded}
                onItemUpdated={handleItemUpdated}
                onItemDeleted={handleItemDeleted}
              />
            </TabsContent>

            {partner && (
              <TabsContent value="partner" className="mt-6">
                <Bookshelf
                  title={t("partnerManual", { name: partner.name })}
                  items={partnerItems}
                  targetUserId={partner.id}
                  currentUserId={userId}
                  partnershipId={partnershipId}
                  loading={loading}
                  onItemAdded={handleItemAdded}
                  onItemUpdated={handleItemUpdated}
                  onItemDeleted={handleItemDeleted}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}

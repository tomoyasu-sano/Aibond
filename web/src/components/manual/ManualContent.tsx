"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCover } from "@/components/manual/BookCover";
import { BookContent } from "@/components/manual/BookContent";
// import { ManualOnboarding } from "@/components/onboarding/ManualOnboarding";
import { MobileNavMenu } from "@/components/MobileNavMenu";
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
  userLanguage?: string;
}

export function ManualContent({
  userId,
  userName,
  partner,
  partnershipId,
  userLanguage = "ja",
}: ManualContentProps) {
  const t = useTranslations("manual");
  const [myItems, setMyItems] = useState<ManualItem[]>([]);
  const [partnerItems, setPartnerItems] = useState<ManualItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBook, setOpenBook] = useState<"my" | "partner" | null>(null);
  const [myCoverImageUrl, setMyCoverImageUrl] = useState<string | undefined>();
  const [partnerCoverImageUrl, setPartnerCoverImageUrl] = useState<string | undefined>();
  const [lastDeleteCheck, setLastDeleteCheck] = useState<string | null>(null);

  // 履歴削除を検知してカバー画像をリセット
  useEffect(() => {
    const checkHistoryDeleted = () => {
      const deleted = localStorage.getItem("aibond_history_deleted");
      if (deleted && deleted !== lastDeleteCheck) {
        // 履歴が削除された - カバー画像をリセット
        setMyCoverImageUrl(undefined);
        setPartnerCoverImageUrl(undefined);
        setLastDeleteCheck(deleted);
        // フラグをクリア
        localStorage.removeItem("aibond_history_deleted");
      }
    };

    // 初回チェック
    checkHistoryDeleted();

    // カスタムイベントをリッスン
    const handleHistoryDeleted = () => {
      setMyCoverImageUrl(undefined);
      setPartnerCoverImageUrl(undefined);
    };
    window.addEventListener("aibond:history-deleted", handleHistoryDeleted);

    // storageイベントをリッスン（他タブからの変更を検知）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "aibond_history_deleted") {
        setMyCoverImageUrl(undefined);
        setPartnerCoverImageUrl(undefined);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("aibond:history-deleted", handleHistoryDeleted);
      window.removeEventListener("storage", handleStorage);
    };
  }, [lastDeleteCheck]);

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

  // 自分の取説のカバー画像を取得
  useEffect(() => {
    async function fetchMyCoverImage() {
      try {
        const res = await fetch(`/api/manual/cover-image?target_user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setMyCoverImageUrl(data.url);
        }
      } catch (error) {
        console.error("Error fetching my cover image:", error);
      }
    }

    fetchMyCoverImage();
  }, [userId]);

  // パートナーの取説を取得
  useEffect(() => {
    if (!partner) return;

    async function fetchPartnerItems() {
      if (!partner) return;
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

  // パートナーの取説のカバー画像を取得
  useEffect(() => {
    if (!partner) return;

    async function fetchPartnerCoverImage() {
      if (!partner) return;
      try {
        const res = await fetch(`/api/manual/cover-image?target_user_id=${partner.id}`);
        if (res.ok) {
          const data = await res.json();
          setPartnerCoverImageUrl(data.url);
        }
      } catch (error) {
        console.error("Error fetching partner cover image:", error);
      }
    }

    fetchPartnerCoverImage();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 md:h-16 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">Aibond</span>
            </Link>
            <h1 className="text-base md:text-lg font-semibold">{t("pageTitle")}</h1>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="hidden md:block">
                <Button variant="ghost" size="sm">{t("backToDashboard")}</Button>
              </Link>
              <MobileNavMenu />
            </div>
          </div>
        </header>
        <main className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex items-center justify-center p-12">
            <div className="text-slate-500">読み込み中...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* <ManualOnboarding /> */}
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 md:h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">Aibond</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">{t("pageTitle")}</h1>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="hidden md:block">
              <Button variant="ghost" size="sm">{t("backToDashboard")}</Button>
            </Link>
            <MobileNavMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* PC: 左右2カラム、スマホ: タブ切り替え */}
        <div className="hidden lg:flex lg:justify-center lg:items-start lg:gap-24 xl:gap-32 py-8">
          {/* 左: 自分の本 */}
          <div className="flex flex-col items-center" data-onboarding="my-book">
            <BookCover
              title={userName || "自分"}
              itemCount={myItems.length}
              isOwn={true}
              onClick={() => setOpenBook("my")}
              targetUserId={userId}
              coverImageUrl={myCoverImageUrl}
              onImageUploaded={(url) => setMyCoverImageUrl(url)}
            />
          </div>

          {/* 右: パートナーの本 */}
          {partner && (
            <div className="flex flex-col items-center">
              <BookCover
                title={partner.name}
                itemCount={partnerItems.length}
                isOwn={false}
                onClick={() => setOpenBook("partner")}
                targetUserId={partner.id}
                coverImageUrl={partnerCoverImageUrl}
                onImageUploaded={(url) => setPartnerCoverImageUrl(url)}
              />
            </div>
          )}
        </div>

        {/* スマホ: タブ切り替え */}
        <div className="lg:hidden pb-12">
          <Tabs defaultValue="my" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="my" className="min-w-0 px-2">
                <span className="truncate block">{userName || "自分"}</span>
              </TabsTrigger>
              {partner && (
                <TabsTrigger value="partner" className="min-w-0 px-2">
                  <span className="truncate block">{partner.name}</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my" className="flex justify-center mt-8 data-[state=inactive]:hidden" forceMount>
              <BookCover
                title={userName || "自分"}
                itemCount={myItems.length}
                isOwn={true}
                onClick={() => setOpenBook("my")}
                targetUserId={userId}
                coverImageUrl={myCoverImageUrl}
                onImageUploaded={(url) => setMyCoverImageUrl(url)}
              />
            </TabsContent>

            {partner && (
              <TabsContent value="partner" className="flex justify-center mt-8 data-[state=inactive]:hidden" forceMount>
                <BookCover
                  title={partner.name}
                  itemCount={partnerItems.length}
                  isOwn={false}
                  onClick={() => setOpenBook("partner")}
                  targetUserId={partner.id}
                  coverImageUrl={partnerCoverImageUrl}
                  onImageUploaded={(url) => setPartnerCoverImageUrl(url)}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      {/* 本の内容（モーダル） */}
      <BookContent
        isOpen={openBook === "my"}
        onClose={() => setOpenBook(null)}
        title={`${userName || "自分"}の取説`}
        items={myItems}
        targetUserId={userId}
        currentUserId={userId}
        partnershipId={partnershipId}
        isOwn={true}
        userLanguage={userLanguage}
        onItemAdded={handleItemAdded}
        onItemUpdated={handleItemUpdated}
        onItemDeleted={handleItemDeleted}
      />

      {partner && (
        <BookContent
          isOpen={openBook === "partner"}
          onClose={() => setOpenBook(null)}
          title={`${partner.name}の取説`}
          items={partnerItems}
          targetUserId={partner.id}
          currentUserId={userId}
          partnershipId={partnershipId}
          isOwn={false}
          userLanguage={userLanguage}
          onItemAdded={handleItemAdded}
          onItemUpdated={handleItemUpdated}
          onItemDeleted={handleItemDeleted}
        />
      )}
    </div>
  );
}

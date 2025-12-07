"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Book } from "@/components/manual/Book";
import { ManualItemModal } from "@/components/manual/ManualItemModal";
import { MANUAL_CATEGORIES } from "@/lib/manual/config";
import { getCurrentRank, getItemsToNextRank, calculateLevel } from "@/lib/manual/config";
import type { ManualItem, ManualCategory } from "@/types/manual";
import { Plus } from "lucide-react";

interface BookshelfProps {
  title: string;
  items: ManualItem[];
  targetUserId: string;
  currentUserId: string;
  partnershipId?: string;
  loading: boolean;
  onItemAdded: (item: ManualItem) => void;
  onItemUpdated: (item: ManualItem) => void;
  onItemDeleted: (itemId: string, targetUserId: string) => void;
}

export function Bookshelf({
  title,
  items,
  targetUserId,
  currentUserId,
  partnershipId,
  loading,
  onItemAdded,
  onItemUpdated,
  onItemDeleted,
}: BookshelfProps) {
  const t = useTranslations("manual");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ManualItem | null>(null);

  // カテゴリごとにアイテムをグループ化
  const itemsByCategory = useMemo(() => {
    const grouped: Record<ManualCategory, ManualItem[]> = {
      basic: [],
      personality: [],
      hobbies: [],
      communication: [],
      lifestyle: [],
      other: [],
    };

    items.forEach((item) => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    return grouped;
  }, [items]);

  // レベル・ランク計算
  const currentRank = getCurrentRank(items.length);
  const level = calculateLevel(items.length);
  const itemsToNextRank = getItemsToNextRank(items.length);

  // 進捗率の計算（次のランクまでの進捗）
  const progressPercent = itemsToNextRank !== null
    ? Math.min(100, ((items.length - currentRank.minItems) / (currentRank.maxItems - currentRank.minItems + 1)) * 100)
    : 100;

  const handleEdit = (item: ManualItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* タイトル & レベル表示 */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{title}</h2>

        {/* 進捗バー（モダンなデザイン） */}
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Lv.{level}
          </span>
          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
            {currentRank.title}
          </span>
          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-xs shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {items.length}項目
            {itemsToNextRank !== null && ` / 次ランクまで${itemsToNextRank}`}
          </span>
        </div>
      </div>

      {/* 本棚 */}
      <Card className="p-6 bg-gradient-to-br from-amber-50/70 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/60 dark:border-amber-800/60 rounded-xl shadow-sm">
        {items.length === 0 ? (
          // 空の状態
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 mb-2 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <Plus size={32} className="text-slate-400" />
            </div>
            <div className="text-xl font-medium text-slate-800 dark:text-slate-200">{t("emptyState")}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-md">
              {t("emptyDescription")}
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="mt-4 gap-2 rounded-lg">
              <Plus size={18} />
              {t("addItem")}
            </Button>
          </div>
        ) : (
          // カテゴリごとの棚
          <div className="space-y-8">
            {Object.entries(MANUAL_CATEGORIES).map(([key, category]) => {
              const categoryItems = itemsByCategory[key as ManualCategory];
              if (categoryItems.length === 0) return null;

              const CategoryIcon = category.icon;

              return (
                <div key={key} className="relative">
                  {/* カテゴリラベル */}
                  <div className="relative flex items-center gap-2 mb-4 pl-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <CategoryIcon size={16} strokeWidth={2} className="text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {t(`category${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({categoryItems.length})
                    </span>
                  </div>

                  {/* 棚板 */}
                  <div className="relative">
                    {/* 本を並べる領域（横スクロール） */}
                    <div className="relative flex gap-3 items-end pb-2 px-4 min-h-[145px] overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                      {categoryItems.map((item) => (
                        <div key={item.id} className="relative flex-shrink-0">
                          <Book
                            item={item}
                            onEdit={() => handleEdit(item)}
                            onDelete={() => onItemDeleted(item.id, targetUserId)}
                          />
                          {/* 本の下の柔らかい影 */}
                          <div
                            className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-[85%] h-1.5 rounded-full blur-sm"
                            style={{
                              background: "radial-gradient(ellipse, rgba(0, 0, 0, 0.15) 0%, transparent 70%)",
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* 棚板全体（柔らかいデザイン） */}
                    <div className="relative">
                      {/* 奥の薄い影 */}
                      <div className="relative h-1.5 overflow-hidden rounded-t-sm">
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(to bottom,
                              #8B7355 0%,
                              #9A8169 100%)`,
                            opacity: 0.5,
                          }}
                        />
                      </div>

                      {/* 手前の縁（明るく柔らかく） */}
                      <div className="relative h-5 rounded-b-lg overflow-hidden shadow-md">
                        {/* 木目調のグラデーション（明るめ・柔らかめ） */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(to bottom,
                              #E6D5C3 0%,
                              #D2C4B0 25%,
                              #C9BA9E 50%,
                              #BFB092 75%,
                              #B5A888 100%)`,
                          }}
                        />

                        {/* 上部の柔らかいハイライト */}
                        <div
                          className="absolute top-0 left-0 right-0 h-2"
                          style={{
                            background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.5), transparent)",
                          }}
                        />

                        {/* 下部の柔らかい影 */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-1.5"
                          style={{
                            background: "linear-gradient(to top, rgba(0, 0, 0, 0.15), transparent)",
                          }}
                        />
                      </div>
                    </div>

                    {/* 棚の下の柔らかい影 */}
                    <div
                      className="absolute -bottom-2 left-0 right-0 h-2 blur-sm opacity-15"
                      style={{
                        background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, transparent)",
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* 本を追加ボタン */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                className="border-dashed border-2 gap-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
              >
                <Plus size={18} />
                {t("addItem")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* モーダル */}
      <ManualItemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        targetUserId={targetUserId}
        currentUserId={currentUserId}
        partnershipId={partnershipId}
        editingItem={editingItem}
        onItemAdded={onItemAdded}
        onItemUpdated={onItemUpdated}
      />
    </div>
  );
}

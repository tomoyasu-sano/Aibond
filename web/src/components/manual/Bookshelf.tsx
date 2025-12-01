"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Book } from "@/components/manual/Book";
import { ManualItemModal } from "@/components/manual/ManualItemModal";
import { MANUAL_CATEGORIES } from "@/lib/manual/config";
import { getCurrentLevel, getItemsToNextLevel } from "@/lib/manual/config";
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

  // レベル計算
  const currentLevel = getCurrentLevel(items.length);
  const itemsToNext = getItemsToNextLevel(items.length);

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
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* タイトル & レベル表示 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="font-medium">
            {currentLevel.emoji} {currentLevel.title}
          </div>
          <div>|</div>
          <div>
            {items.length} {t("items")}
          </div>
          {itemsToNext !== null && (
            <>
              <div>|</div>
              <div>{t("itemsToNextLevel", { count: itemsToNext })}</div>
            </>
          )}
        </div>
      </div>

      {/* 本棚 */}
      <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-800">
        {items.length === 0 ? (
          /* 空の状態 */
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="text-7xl mb-2">📚</div>
            <div className="text-xl font-medium text-center">{t("emptyState")}</div>
            <div className="text-sm text-muted-foreground text-center max-w-md">
              {t("emptyDescription")}
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="mt-4 gap-2">
              <Plus size={18} />
              {t("addItem")}
            </Button>
          </div>
        ) : (
          /* カテゴリごとの棚 */
          <div className="space-y-8">
            {Object.entries(MANUAL_CATEGORIES).map(([key, category]) => {
              const categoryItems = itemsByCategory[key as ManualCategory];
              if (categoryItems.length === 0) return null;

              const CategoryIcon = category.icon;

              return (
                <div key={key} className="relative">
                  {/* カテゴリラベル */}
                  <div className="flex items-center gap-2 mb-3 pl-2">
                    <CategoryIcon size={20} strokeWidth={2} className="text-gray-700 dark:text-gray-300" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {t(`category${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({categoryItems.length})
                    </span>
                  </div>

                  {/* 棚板 */}
                  <div className="relative">
                    {/* 本を並べる領域 */}
                    <div className="relative flex flex-wrap gap-2 items-end pb-2 px-4 min-h-[180px]">
                      {categoryItems.map((item) => (
                        <Book
                          key={item.id}
                          item={item}
                          onEdit={() => handleEdit(item)}
                          onDelete={() => onItemDeleted(item.id, targetUserId)}
                        />
                      ))}
                    </div>

                    {/* 棚板本体（木の板） */}
                    <div className="relative h-4 rounded-md overflow-hidden shadow-md">
                      {/* 木目調のグラデーション */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(to bottom,
                            #8B4513 0%,
                            #A0522D 20%,
                            #8B4513 40%,
                            #654321 60%,
                            #8B4513 80%,
                            #654321 100%)`,
                        }}
                      />
                      {/* 木目のテクスチャ（縦線） */}
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: `repeating-linear-gradient(
                            90deg,
                            transparent,
                            transparent 10px,
                            rgba(0, 0, 0, 0.1) 10px,
                            rgba(0, 0, 0, 0.1) 11px
                          )`,
                        }}
                      />
                      {/* 上部のハイライト */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{
                          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent)",
                        }}
                      />
                      {/* 下部の影 */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1"
                        style={{
                          background: "linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent)",
                        }}
                      />
                    </div>

                    {/* 棚の下の影 */}
                    <div
                      className="absolute -bottom-2 left-0 right-0 h-2 blur-sm opacity-20"
                      style={{
                        background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.3), transparent)",
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* 本を追加ボタン */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={() => setIsModalOpen(true)}
                variant="outline"
                className="border-dashed border-2 gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/20"
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

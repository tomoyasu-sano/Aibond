"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ManualItemModal } from "@/components/manual/ManualItemModal";
import { OnboardingModal } from "@/components/manual/OnboardingModal";
import { VoiceInputModal } from "@/components/manual/VoiceInputModal";
import { MANUAL_CATEGORIES } from "@/lib/manual/config";
import type { ManualItem, ManualCategory } from "@/types/manual";
import { X, Plus, Trash2, Edit, Mic } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BookContentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: ManualItem[];
  targetUserId: string;
  currentUserId: string;
  partnershipId?: string;
  isOwn: boolean;
  userLanguage?: string;
  onItemAdded: (item: ManualItem) => void;
  onItemUpdated: (item: ManualItem) => void;
  onItemDeleted: (itemId: string, targetUserId: string) => void;
}

export function BookContent({
  isOpen,
  onClose,
  title,
  items,
  targetUserId,
  currentUserId,
  partnershipId,
  isOwn,
  userLanguage = "ja",
  onItemAdded,
  onItemUpdated,
  onItemDeleted,
}: BookContentProps) {
  const t = useTranslations("manual");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ManualItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ManualItem | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 本を開いた時、アイテムが0ならオンボーディングを表示
  useEffect(() => {
    if (isOpen && items.length === 0) {
      setShowOnboarding(true);
    }
  }, [isOpen, items.length]);

  // カテゴリごとにアイテムをグループ化
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<ManualCategory, ManualItem[]>);

  const handleEdit = (item: ManualItem) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (deletingItem) {
      onItemDeleted(deletingItem.id, targetUserId);
      setDeletingItem(null);
    }
  };

  const handleOnboardingComplete = (newItems: ManualItem[]) => {
    newItems.forEach((item) => onItemAdded(item));
    setShowOnboarding(false);
  };

  const handleVoiceItemsGenerated = (newItems: ManualItem[]) => {
    newItems.forEach((item) => onItemAdded(item));
  };

  const accentColor = isOwn
    ? "border-pink-300 bg-pink-50/50"
    : "border-blue-300 bg-blue-50/50";

  // スライド方向（自分=右から、パートナー=左から）
  const slideDirection = isOwn ? "100%" : "-100%";
  const position = isOwn ? "right-0" : "left-0";

  // デフォルトで全カテゴリーを開く
  const allCategoryKeys = Object.keys(MANUAL_CATEGORIES);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40"
              style={{
                perspective: "1500px",
                perspectiveOrigin: "50% 50%",
              }}
            />

            {/* 本の内容 */}
            <motion.div
              initial={{
                x: isOwn ? "50%" : "-50%",
                rotateY: isOwn ? -45 : 45,
                scale: 0.8,
                opacity: 0,
              }}
              animate={{
                x: 0,
                rotateY: 0,
                scale: 1,
                opacity: 1,
              }}
              exit={{
                x: isOwn ? "50%" : "-50%",
                rotateY: isOwn ? -45 : 45,
                scale: 0.8,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200,
                opacity: { duration: 0.3 },
              }}
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: isOwn ? "right center" : "left center",
              }}
              className={`fixed ${position} top-0 bottom-0 w-full md:w-2/3 lg:w-1/2 bg-background shadow-2xl z-50 overflow-y-auto`}
            >
              {/* ヘッダー */}
              <div className={`sticky top-0 z-10 bg-background border-b-2 ${accentColor} p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{title}</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="rounded-full"
                  >
                    <X size={20} />
                  </Button>
                </div>
              </div>

              {/* 本の内容 */}
              <div className="p-6">
                {items.length === 0 ? (
                  // 空の状態
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-6xl mb-4">📝</div>
                    <p className="text-lg font-medium mb-2">{t("emptyState")}</p>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                      {t("emptyDescription")}
                    </p>
                    <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                      <Plus size={18} />
                      {t("addItem")}
                    </Button>
                  </div>
                ) : (
                  // カテゴリー別アコーディオン
                  <div className="space-y-3">
                    <Accordion type="multiple" defaultValue={allCategoryKeys} className="space-y-2">
                      {Object.entries(MANUAL_CATEGORIES).map(([key, category]) => {
                        const categoryItems = itemsByCategory[key as ManualCategory] || [];
                        const CategoryIcon = category.icon;

                        return (
                          <AccordionItem
                            key={key}
                            value={key}
                            className={`border-2 rounded-lg ${accentColor} overflow-hidden`}
                          >
                            <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/50">
                              <div className="flex items-center gap-2.5 flex-1">
                                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background">
                                  <CategoryIcon size={16} />
                                </div>
                                <span className="font-semibold text-sm">
                                  {t(`category${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
                                </span>
                                <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${isOwn ? "bg-pink-200 text-pink-800" : "bg-blue-200 text-blue-800"}`}>
                                  {categoryItems.length}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-3 pt-1">
                              {categoryItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                  このカテゴリーはまだ空です
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                  {categoryItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="group relative border border-transparent hover:border-border rounded-md bg-background/50 hover:bg-muted/30 transition-all cursor-pointer"
                                      onClick={() => setActiveItemId(activeItemId === item.id ? null : item.id)}
                                    >
                                      <div className="flex items-center justify-between gap-2 p-2 pr-1">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm leading-tight">
                                            <span className="text-xs font-medium text-muted-foreground">{item.question}:</span>
                                            {item.answer && (
                                              <span className="ml-1.5">{item.answer}</span>
                                            )}
                                            {!item.answer && item.date && (
                                              <span className="ml-1.5 text-muted-foreground">{new Date(item.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            )}
                                          </p>
                                        </div>

                                        {/* PC: ホバーで表示、スマホ: クリックで表示 */}
                                        <div className={`flex gap-0.5 transition-opacity ${
                                          activeItemId === item.id
                                            ? "opacity-100"
                                            : "opacity-0 md:group-hover:opacity-100"
                                        }`}>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEdit(item);
                                            }}
                                            className="h-7 w-7 p-0"
                                          >
                                            <Edit size={12} />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeletingItem(item);
                                            }}
                                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>

                    {/* 追加ボタン */}
                    <div className="flex justify-center gap-2 pt-2">
                      <Button
                        onClick={() => setIsAddModalOpen(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Plus size={18} />
                        {t("addItem")}
                      </Button>
                      <Button
                        onClick={() => setIsVoiceModalOpen(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Mic size={18} />
                        音声で追加
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* アイテム追加/編集モーダル */}
      <ManualItemModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        targetUserId={targetUserId}
        currentUserId={currentUserId}
        partnershipId={partnershipId}
        editingItem={editingItem}
        onItemAdded={onItemAdded}
        onItemUpdated={onItemUpdated}
      />

      {/* オンボーディングモーダル */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        targetUserId={targetUserId}
        currentUserId={currentUserId}
        partnershipId={partnershipId}
        onComplete={handleOnboardingComplete}
      />

      {/* 音声入力モーダル */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        targetUserId={targetUserId}
        userLanguage={userLanguage}
        onItemsGenerated={handleVoiceItemsGenerated}
      />

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>項目を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。本当に削除してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

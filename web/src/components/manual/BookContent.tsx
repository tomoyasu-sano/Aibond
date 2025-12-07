"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
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
import { toast } from "sonner";

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
  const [activeCategory, setActiveCategory] = useState<ManualCategory | "all">("all");

  // 本を開いた時、アイテムが0ならオンボーディングを表示
  useEffect(() => {
    if (isOpen && items.length === 0) {
      setShowOnboarding(true);
    }
  }, [isOpen, items.length]);

  const handleEdit = (item: ManualItem) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/manual/items/${deletingItem.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Delete failed:", res.status, errorData);
        throw new Error(errorData.details || errorData.error || `HTTP ${res.status}`);
      }
      onItemDeleted(deletingItem.id, targetUserId);
      toast.success("削除しました");
    } catch (e) {
      console.error("Delete error:", e);
      toast.error(`削除に失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
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

  // スライド方向（自分=右から、パートナー=左から）
  const position = isOwn ? "right-0" : "left-0";

  // Color themes
  const gradientFrom = isOwn ? "from-pink-50" : "from-blue-50";
  const tabActiveClass = isOwn
    ? "bg-pink-500 text-white"
    : "bg-blue-500 text-white";
  const cardHoverBorder = isOwn
    ? "hover:border-pink-200"
    : "hover:border-blue-200";
  const labelColor = isOwn ? "text-pink-400" : "text-blue-400";
  const addButtonHover = isOwn
    ? "hover:border-pink-300 hover:text-pink-400 hover:bg-pink-50/30"
    : "hover:border-blue-300 hover:text-blue-400 hover:bg-blue-50/30";

  // Get displayed name
  const displayName = title.replace(/の取説$/, "");

  // Filter items by category
  const filteredItems = activeCategory === "all"
    ? items
    : items.filter((item) => item.category === activeCategory);

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

            {/* 本の内容 - Card Grid with Tabs Design */}
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
              className={`fixed ${position} top-0 bottom-0 w-full md:w-2/3 lg:w-1/2 max-w-lg bg-white shadow-2xl z-50 flex flex-col`}
            >
              {/* Header */}
              <div className={`relative px-6 py-5 bg-gradient-to-r ${gradientFrom} to-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1 h-6 bg-gradient-to-b ${isOwn ? "from-pink-400 to-rose-400" : "from-blue-400 to-sky-400"} rounded-full`}></div>
                      <p className={`text-[10px] ${labelColor} tracking-[0.2em]`}>TORISETU</p>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800 pl-3" style={{ fontFamily: "serif" }}>
                      {displayName}&apos;s Manual
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full hover:bg-white/80 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="px-4 py-3 border-b border-gray-100 overflow-x-auto">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveCategory("all")}
                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      activeCategory === "all"
                        ? tabActiveClass
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t("allCategories")}
                  </button>
                  {Object.entries(MANUAL_CATEGORIES).map(([key, category]) => (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key as ManualCategory)}
                      className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        activeCategory === key
                          ? tabActiveClass
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {t(`category${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content - Card Grid */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <div className="p-4">
                  {items.length === 0 ? (
                    // 空の状態
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="text-6xl mb-4">📝</div>
                      <p className="text-lg font-medium text-gray-700 mb-2">{t("emptyState")}</p>
                      <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
                        {t("emptyDescription")}
                      </p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    // カテゴリが空の状態
                    <div className="flex flex-col items-center justify-center py-16">
                      <p className="text-sm text-gray-500">{t("categoryEmpty")}</p>
                    </div>
                  ) : (
                    // Cards Grid
                    <div className="grid grid-cols-2 gap-3">
                      {filteredItems.map((item) => {
                        const isLongContent = (item.answer?.length || 0) > 30;
                        return (
                          <div
                            key={item.id}
                            className={`group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 ${cardHoverBorder} ${
                              isLongContent ? "col-span-2" : ""
                            }`}
                            onClick={() => setActiveItemId(activeItemId === item.id ? null : item.id)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className={`text-[10px] font-medium ${labelColor} uppercase tracking-wider`}>
                                {item.question}
                              </span>
                              <div className={`flex gap-0.5 transition-opacity ${
                                activeItemId === item.id
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                              }`}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(item);
                                  }}
                                  className="p-1 rounded hover:bg-gray-100"
                                >
                                  <Edit className="w-3 h-3 text-gray-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingItem(item);
                                  }}
                                  className="p-1 rounded hover:bg-gray-100"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 font-medium leading-relaxed">
                              {item.answer || (item.date && new Date(item.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }))}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className={`flex-1 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 ${addButtonHover} transition-all flex items-center justify-center gap-2`}
                    >
                      <Plus className="w-4 h-4" />
                      {t("addItem")}
                    </button>
                    <button
                      onClick={() => setIsVoiceModalOpen(true)}
                      className={`flex-1 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 ${addButtonHover} transition-all flex items-center justify-center gap-2`}
                    >
                      <Mic className="w-4 h-4" />
                      {t("addByVoice")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer with stats */}
              <div className="px-6 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{t("totalItems", { count: items.length })}</span>
                  <span>{t("lastUpdated", { date: items.length > 0 ? new Date(Math.max(...items.map(i => new Date(i.updated_at || i.created_at).getTime()))).toLocaleDateString() : "-" })}</span>
                </div>
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

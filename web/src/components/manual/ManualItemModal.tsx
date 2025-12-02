"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MANUAL_CATEGORIES } from "@/lib/manual/config";
import type { ManualItem, ManualCategory } from "@/types/manual";

interface ManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  currentUserId: string;
  partnershipId?: string;
  editingItem?: ManualItem | null;
  onItemAdded: (item: ManualItem) => void;
  onItemUpdated: (item: ManualItem) => void;
}

export function ManualItemModal({
  isOpen,
  onClose,
  targetUserId,
  currentUserId,
  partnershipId,
  editingItem,
  onItemAdded,
  onItemUpdated,
}: ManualItemModalProps) {
  const t = useTranslations("manual");
  const [category, setCategory] = useState<ManualCategory>("basic");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  // 今日の日付を取得（YYYY-MM-DD形式）
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // 編集モードの場合、フォームを初期化
  useEffect(() => {
    if (editingItem) {
      setCategory(editingItem.category);
      setQuestion(editingItem.question);
      setAnswer(editingItem.answer);
      setDate(editingItem.date || "");
    } else {
      setCategory("basic");
      setQuestion("");
      setAnswer("");
      setDate(getTodayDate());
    }
  }, [editingItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingItem) {
        // 更新
        const res = await fetch(`/api/manual/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            question,
            answer,
            date: date || undefined,
          }),
        });

        if (res.ok) {
          const updatedItem = await res.json();
          onItemUpdated(updatedItem);
          onClose();
        } else {
          console.error("Failed to update item");
        }
      } else {
        // 新規作成
        const res = await fetch("/api/manual/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_user_id: targetUserId,
            category,
            question,
            answer,
            date: date || undefined,
          }),
        });

        if (res.ok) {
          const newItem = await res.json();
          onItemAdded(newItem);
          onClose();
        } else {
          console.error("Failed to create item");
        }
      }
    } catch (error) {
      console.error("Error saving item:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? t("editItem") : t("addItem")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* カテゴリ選択 */}
          <div className="space-y-2">
            <Label htmlFor="category">{t("category")}</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as ManualCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MANUAL_CATEGORIES).map(([key, cat]) => {
                  const Icon = cat.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon size={16} />
                        {t(`category${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 質問 */}
          <div className="space-y-2">
            <Label htmlFor="question">{t("question")}</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("questionPlaceholder")}
              required
            />
          </div>

          {/* 回答 */}
          <div className="space-y-2">
            <Label htmlFor="answer">{t("answer")}</Label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={t("answerPlaceholder")}
              rows={3}
            />
          </div>

          {/* 日付 */}
          <div className="space-y-2">
            <Label htmlFor="date">日付（任意）</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              誕生日、記念日、期限などを入力できます
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancelButton")}
            </Button>
            <Button type="submit" disabled={saving || !question}>
              {saving
                ? editingItem
                  ? t("savingButton")
                  : t("addingButton")
                : editingItem
                ? t("saveButton")
                : t("addButton")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

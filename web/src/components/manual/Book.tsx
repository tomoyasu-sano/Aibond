"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MANUAL_CATEGORIES } from "@/lib/manual/config";
import type { ManualItem } from "@/types/manual";
import { Edit2, Trash2 } from "lucide-react";

interface BookProps {
  item: ManualItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function Book({ item, onEdit, onDelete }: BookProps) {
  const t = useTranslations("manual");
  const category = MANUAL_CATEGORIES[item.category];
  const IconComponent = category.icon;
  const bookColor = item.color || category.defaultColor;

  // ランダムな傾きと高さのバリエーション
  const randomRotation = Math.random() * 3 - 1.5; // -1.5deg ~ 1.5deg
  const randomHeight = 140 + Math.random() * 60; // 140px ~ 200px

  // 色を暗くする関数（背表紙の側面用）
  const darkenColor = (color: string, amount: number = 30) => {
    const hex = color.replace("#", "");
    const num = parseInt(hex, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  };

  const darkColor = darkenColor(bookColor);
  const veryDarkColor = darkenColor(bookColor, 50);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      whileHover={{ scale: 1.03, y: -5, rotateY: -5 }}
      transition={{ duration: 0.2 }}
      className="relative group"
      style={{
        height: `${randomHeight}px`,
        perspective: "1000px",
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className="relative h-full cursor-pointer"
            style={{
              width: "48px",
              transformStyle: "preserve-3d",
              transform: `rotateZ(${randomRotation}deg)`,
            }}
          >
            {/* 本体（背表紙） */}
            <div
              className="absolute inset-0 rounded-sm flex flex-col items-center justify-between py-3 px-1 transition-all duration-200"
              style={{
                background: `linear-gradient(to right, ${darkColor} 0%, ${bookColor} 10%, ${bookColor} 90%, ${veryDarkColor} 100%)`,
                boxShadow: `
                  2px 4px 8px rgba(0, 0, 0, 0.15),
                  inset -2px 0 4px rgba(0, 0, 0, 0.1),
                  inset 2px 0 4px rgba(255, 255, 255, 0.1)
                `,
                borderLeft: `1px solid ${veryDarkColor}`,
                borderRight: `1px solid ${darkColor}`,
              }}
            >
              {/* アイコン（上部） */}
              <div className="flex-shrink-0 opacity-70">
                <IconComponent size={18} strokeWidth={2} className="text-gray-700 dark:text-gray-300" />
              </div>

              {/* タイトル（縦書き） */}
              <div
                className="flex-1 flex items-center justify-center overflow-hidden px-0.5"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "upright",
                }}
              >
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 tracking-tight line-clamp-4">
                  {item.question}
                </span>
              </div>

              {/* 装飾ライン */}
              <div className="flex-shrink-0 w-6 h-0.5 bg-gray-700/20 dark:bg-gray-300/20 rounded-full" />
            </div>

            {/* 背表紙の右側面（3D効果） */}
            <div
              className="absolute top-0 bottom-0 right-0 w-1 rounded-r-sm"
              style={{
                background: `linear-gradient(to bottom, ${veryDarkColor} 0%, ${darkColor} 50%, ${veryDarkColor} 100%)`,
                transform: "translateX(1px)",
              }}
            />

            {/* ホバー時のグロー効果 */}
            <div
              className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              style={{
                boxShadow: `0 0 20px ${bookColor}80`,
              }}
            />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Edit2 className="mr-2 h-4 w-4" />
            {t("editItem")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("deleteItem")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ツールチップ（ホバー時に質問と回答を表示） */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="bg-popover text-popover-foreground p-4 rounded-lg shadow-xl border max-w-xs">
          <div className="font-semibold mb-2 text-sm">{item.question}</div>
          {item.answer && (
            <div className="text-xs text-muted-foreground leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

"use client";

import React from "react";
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
  const bookColor = category.defaultColor;

  // ランダムな高さのバリエーション（控えめに）
  const randomHeight = 120 + Math.random() * 25; // 120px ~ 145px

  // ホバー状態とツールチップ位置を追跡
  const [isHovered, setIsHovered] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] = React.useState({ top: 0, left: 0 });

  // マウス位置でツールチップを表示
  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPosition({
      top: e.clientY,
      left: e.clientX + 20, // マウスカーソルの右側20pxに表示
    });
  };

  // スマホ対応：タップでツールチップを表示
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTooltipPosition({
      top: touch.clientY,
      left: touch.clientX + 20,
    });
    setIsHovered(true);
  };

  const handleTouchEnd = () => {
    // 2秒後に自動的に閉じる
    setTimeout(() => setIsHovered(false), 2000);
  };

  // 色を少し暗くする（柔らかめ）
  const darkenColor = (color: string, amount: number = 20) => {
    const hex = color.replace("#", "");
    const num = parseInt(hex, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  };

  const darkColor = darkenColor(bookColor, 15);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        handleMouseMove(e);
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative group z-50"
      style={{ height: `${randomHeight}px` }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className="relative h-full cursor-pointer"
            style={{ width: "42px" }}
          >
            {/* 本体（背表紙） */}
            <div
              className="absolute inset-0 rounded-lg flex flex-col items-center justify-between py-2 px-1 transition-all duration-200"
              style={{
                background: `linear-gradient(to right,
                  ${darkColor} 0%,
                  ${bookColor} 8%,
                  ${bookColor} 92%,
                  ${darkColor} 100%)`,
                boxShadow: `
                  0 2px 6px rgba(0, 0, 0, 0.08),
                  0 4px 12px rgba(0, 0, 0, 0.05),
                  inset -1px 0 3px rgba(0, 0, 0, 0.08),
                  inset 1px 0 3px rgba(255, 255, 255, 0.15)
                `,
                borderLeft: `1px solid ${darkColor}20`,
                borderRight: `1px solid ${bookColor}40`,
              }}
            >
              {/* アイコン（上部） */}
              <div className="flex-shrink-0 opacity-75">
                <IconComponent size={14} strokeWidth={2.5} className="text-slate-600 dark:text-slate-300" />
              </div>

              {/* タイトル（縦書き） */}
              <div
                className="flex-1 flex items-center justify-center overflow-hidden px-0.5"
                style={{
                  writingMode: "vertical-rl",
                  textOrientation: "upright",
                }}
              >
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-100 tracking-tight line-clamp-3">
                  {item.question}
                </span>
              </div>

              {/* 装飾ライン */}
              <div className="flex-shrink-0 w-4 h-0.5 bg-slate-600/15 dark:bg-slate-300/15 rounded-full" />
            </div>

            {/* ホバー時の柔らかいグロー */}
            <div
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              style={{
                boxShadow: `0 0 16px ${bookColor}60`,
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

    </motion.div>

      {/* ツールチップ（ホバー時に質問と回答を表示） - fixed位置で本の右側に表示 */}
      {isHovered && (
        <div
          className="fixed pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateY(-50%)',
            writingMode: 'horizontal-tb',
            textOrientation: 'mixed',
            zIndex: 999999,
          }}
        >
          <div
            className="bg-amber-50 dark:bg-amber-900/20 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg shadow-lg border border-amber-200/60 dark:border-amber-800/60 max-w-xs animate-in fade-in-0 zoom-in-95 duration-200"
            style={{
              writingMode: 'horizontal-tb',
              direction: 'ltr',
            }}
          >
            {item.answer ? (
              <div className="text-sm leading-relaxed break-words">
                {item.answer}
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400 italic">
                {t("noAnswer")}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingTooltipProps {
  id: string; // ユニークなID（表示済みかどうかの判定に使用）
  targetSelector: string; // ターゲット要素のCSSセレクタ
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  onComplete?: () => void;
  showOnce?: boolean; // 一度だけ表示（デフォルト: true）
}

export function OnboardingTooltip({
  id,
  targetSelector,
  title,
  description,
  position = "bottom",
  onComplete,
  showOnce = true,
}: OnboardingTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 既に表示済みかチェック
    const storageKey = `onboarding_${id}`;
    if (showOnce && localStorage.getItem(storageKey) === "completed") {
      return;
    }

    // ターゲット要素を探す（少し遅延させて確実に見つける）
    const findTarget = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        setIsVisible(true);
      }
    };

    // 少し遅延させてDOMが完全にレンダリングされてから実行
    const timer = setTimeout(findTarget, 500);

    // リサイズ時に位置を再計算
    const handleResize = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [id, targetSelector, showOnce]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (showOnce) {
      localStorage.setItem(`onboarding_${id}`, "completed");
    }
    onComplete?.();
  };

  if (!isVisible || !targetRect) return null;

  // ツールチップの位置を計算
  const getTooltipPosition = () => {
    const padding = 12;
    const arrowSize = 8;

    switch (position) {
      case "top":
        return {
          top: targetRect.top - padding - arrowSize,
          left: targetRect.left + targetRect.width / 2,
          transform: "translate(-50%, -100%)",
        };
      case "bottom":
        return {
          top: targetRect.bottom + padding + arrowSize,
          left: targetRect.left + targetRect.width / 2,
          transform: "translate(-50%, 0)",
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - padding - arrowSize,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding + arrowSize,
          transform: "translate(0, -50%)",
        };
    }
  };

  const tooltipPosition = getTooltipPosition();

  // 矢印のスタイル
  const getArrowStyle = () => {
    const base = "absolute w-0 h-0 border-solid";
    switch (position) {
      case "top":
        return `${base} bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary`;
      case "bottom":
        return `${base} top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-primary`;
      case "left":
        return `${base} right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-primary`;
      case "right":
        return `${base} left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-primary`;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* 背景オーバーレイ（ターゲット以外を暗くする） */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            style={{
              background: "rgba(0, 0, 0, 0.5)",
              // ターゲット要素の部分を切り抜く
              clipPath: `polygon(
                0% 0%,
                0% 100%,
                ${targetRect.left - 8}px 100%,
                ${targetRect.left - 8}px ${targetRect.top - 8}px,
                ${targetRect.right + 8}px ${targetRect.top - 8}px,
                ${targetRect.right + 8}px ${targetRect.bottom + 8}px,
                ${targetRect.left - 8}px ${targetRect.bottom + 8}px,
                ${targetRect.left - 8}px 100%,
                100% 100%,
                100% 0%
              )`,
            }}
            onClick={handleDismiss}
          />

          {/* ハイライト枠 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[101] pointer-events-none rounded-lg"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: "0 0 0 4px hsl(var(--primary)), 0 0 20px 4px hsl(var(--primary) / 0.3)",
            }}
          />

          {/* ツールチップ */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed z-[102] w-72 bg-primary text-primary-foreground rounded-xl shadow-2xl p-4"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              transform: tooltipPosition.transform,
            }}
          >
            {/* 矢印 */}
            <div className={getArrowStyle()} />

            {/* 閉じるボタン */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
            >
              <X size={16} />
            </button>

            {/* コンテンツ */}
            <div className="pr-6">
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-sm opacity-90 mb-4">{description}</p>
            </div>

            {/* ボタン */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDismiss}
                className="font-medium"
              >
                OK!
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

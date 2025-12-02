"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { getCurrentLevel } from "@/lib/manual/config";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

interface BookCoverProps {
  title: string;
  itemCount: number;
  isOwn: boolean; // true = 自分の取説, false = パートナーの取説
  onClick: () => void;
  coverImageUrl?: string; // カバー画像URL
  targetUserId: string; // アップロード対象のユーザーID
  onImageUploaded?: (url: string) => void; // アップロード完了時のコールバック
}

export function BookCover({ title, itemCount, isOwn, onClick, coverImageUrl, targetUserId, onImageUploaded }: BookCoverProps) {
  const t = useTranslations("manual");
  const currentLevel = getCurrentLevel(itemCount);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [currentCoverImage, setCurrentCoverImage] = useState(coverImageUrl);

  // デフォルト画像（自分用とパートナー用で異なる画像）
  const defaultImage = isOwn
    ? "/images/manual-cover-default-own.svg"
    : "/images/manual-cover-default-partner.svg";
  const displayImage = currentCoverImage || defaultImage;

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_user_id', targetUserId);

      const res = await fetch('/api/manual/cover-image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentCoverImage(data.url);
        onImageUploaded?.(data.url); // 親コンポーネントに通知
      } else {
        console.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
    }
  };

  // 本の厚みを固定（レベルに関わらず統一）
  const thickness = 40; // 固定値

  // 色設定（明るく綺麗に）
  const bookColor = isOwn
    ? "from-pink-50 via-rose-50 to-pink-100 border-pink-200" // 自分: 明るいピンク
    : "from-blue-50 via-sky-50 to-blue-100 border-blue-200"; // パートナー: 明るい青

  const spineColor = isOwn
    ? "from-pink-100 via-rose-100 to-pink-200" // 背表紙: ピンク
    : "from-blue-100 via-sky-100 to-blue-200"; // 背表紙: 青

  const accentColor = isOwn ? "bg-pink-400" : "bg-blue-400";
  const textColor = isOwn ? "text-pink-800" : "text-blue-800";

  return (
    <>
      <LoadingOverlay
        open={uploading}
        message="画像をアップロード中"
        subMessage="少々お待ちください..."
      />
      <motion.button
        onClick={onClick}
        className="relative group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
      whileHover={{
        scale: 1.05,
        rotateY: isOwn ? -5 : 5,
      }}
      whileTap={{
        scale: 0.98,
        rotateY: isOwn ? -15 : 15,
      }}
      transition={{ duration: 0.2 }}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
    >
      <motion.div
        className={`relative bg-gradient-to-br ${bookColor} border-2 cursor-pointer overflow-hidden rounded-lg`}
        style={{
          width: "280px",
          height: "380px",
          transformStyle: "preserve-3d",
        }}
      >
        {/* 本の背表紙（厚み）*/}
        <div
          className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${spineColor}`}
          style={{ width: `${thickness}px` }}
        />

        {/* 栞（しおり）- 右上 */}
        <div className="absolute -top-0 right-8 w-8 h-28 z-10">
          <div
            className={`w-full h-full ${isOwn ? "bg-gradient-to-b from-rose-200 via-rose-300 to-rose-400" : "bg-gradient-to-b from-sky-200 via-sky-300 to-sky-400"} shadow-sm opacity-90`}
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)"
            }}
          />
          {/* しおりの影 */}
          <div
            className="absolute inset-0 bg-black/5 blur-[2px]"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)",
              transform: "translateY(2px)"
            }}
          />
        </div>

        {/* 本の表紙 */}
        <div
          className="h-full flex flex-col p-4 pl-14"
          style={{ marginLeft: `${thickness - 20}px` }}
        >
          {/* 上部: タイトル */}
          <div className="mb-3">
            <h3 className={`text-xl font-bold ${textColor} text-center`}>
              {title}
            </h3>
          </div>

          {/* 中央: カバー画像 */}
          <div className="flex-1 flex items-center justify-center mb-3">
            <div
              className="relative w-full h-full max-h-[200px] rounded-lg overflow-hidden shadow-md group/image cursor-pointer"
              onClick={handleImageClick}
            >
              <img
                src={displayImage}
                alt={`${title}の取説カバー`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 画像読み込み失敗時は明るい背景色で代替
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.style.backgroundColor = isOwn ? '#fdf2f8' : '#eff6ff';
                }}
              />
              {/* アップロードオーバーレイ */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-sm flex items-center gap-2">
                  <Upload size={16} />
                  画像を変更
                </div>
              </div>
              {/* 非表示のファイル入力 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 下部: 説明 */}
          <div className="text-center">
            <p className={`text-xs ${textColor} opacity-70`}>
              {itemCount}枚 {currentLevel.emoji} Lv.{currentLevel.level}
            </p>
          </div>
        </div>

        {/* キラキラエフェクト（ホバー時） */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* 影（立体感） */}
        <motion.div
          className="absolute -bottom-2 -right-2 -z-10 bg-black/5 rounded-lg blur-md"
          style={{
            width: "280px",
            height: "380px",
          }}
        />
      </motion.div>

      {/* レベルアップバッジ（必要に応じて） */}
      {itemCount > 0 && itemCount % 5 === 0 && (
        <div className={`absolute -top-2 -right-2 ${accentColor} text-white text-xs px-3 py-1 rounded-full shadow-lg animate-bounce`}>
          ✨ Level {currentLevel.level}
        </div>
      )}
    </motion.button>
    </>
  );
}

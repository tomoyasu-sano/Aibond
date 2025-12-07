"use client";

import { useTranslations } from "next-intl";
import { getCurrentRank, calculateLevel } from "@/lib/manual/config";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Camera } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

interface BookCoverProps {
  title: string;
  itemCount: number;
  isOwn: boolean;
  onClick: () => void;
  coverImageUrl?: string;
  targetUserId: string;
  onImageUploaded?: (url: string) => void;
}

export function BookCover({
  title,
  itemCount,
  isOwn,
  onClick,
  coverImageUrl,
  targetUserId,
  onImageUploaded,
}: BookCoverProps) {
  const t = useTranslations("manual");
  const currentRank = getCurrentRank(itemCount);
  const level = calculateLevel(itemCount);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [currentCoverImage, setCurrentCoverImage] = useState(coverImageUrl);

  useEffect(() => {
    setCurrentCoverImage(coverImageUrl);
  }, [coverImageUrl]);

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
      formData.append("file", file);
      formData.append("target_user_id", targetUserId);

      const res = await fetch("/api/manual/cover-image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentCoverImage(data.url);
        onImageUploaded?.(data.url);
      } else {
        console.error("Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploading(false);
    }
  };

  // Color themes
  const gradientFrom = isOwn ? "from-rose-100" : "from-sky-100";
  const gradientVia = isOwn ? "via-pink-50" : "via-blue-50";
  const gradientTo = isOwn ? "to-rose-200" : "to-sky-200";
  const textAccentLight = isOwn ? "text-pink-500" : "text-blue-500";
  const textAccentMuted = isOwn ? "text-pink-400" : "text-blue-400";
  const dividerColor = isOwn ? "bg-pink-200" : "bg-blue-200";
  const cornerGradient = isOwn
    ? "from-pink-400 to-rose-400"
    : "from-blue-400 to-sky-400";
  const placeholderBorder = isOwn ? "border-pink-200" : "border-blue-200";
  const placeholderIcon = isOwn ? "text-pink-300" : "text-blue-300";

  // Get romanized name for display
  const displayName = title.replace(/さん$/, "");

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
          y: -12,
          rotate: isOwn ? 1 : -1,
        }}
        whileTap={{
          scale: 0.98,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
      >
        {/* Card Container */}
        <div
          className={`
            relative bg-white rounded-xl overflow-hidden
            w-[260px] h-[400px]
            sm:w-[280px] sm:h-[440px]
            lg:w-[320px] lg:h-[480px]
            shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]
            group-hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)]
            transition-shadow duration-500
          `}
        >
          {/* Hero Image Area */}
          <div className="relative h-[50%] sm:h-[52%] lg:h-[55%] m-2 sm:m-3 mb-0 rounded-t-lg overflow-hidden">
            {/* Background/Image */}
            {currentCoverImage ? (
              <img
                src={currentCoverImage}
                alt={`${title}の取説カバー`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo} flex items-center justify-center`}
              >
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${placeholderBorder} flex items-center justify-center`}
                >
                  <svg
                    className={`w-8 h-8 sm:w-10 sm:h-10 ${placeholderIcon}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Upload Overlay */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 sm:pb-6 cursor-pointer"
              onClick={handleImageClick}
            >
              <div className="text-white text-xs sm:text-sm flex items-center gap-2">
                <Camera size={16} />
                写真を設定
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

          </div>

          {/* Content Area */}
          <div className="h-[50%] sm:h-[48%] lg:h-[45%] px-4 sm:px-5 py-4 sm:py-5 pb-6 sm:pb-8 flex flex-col">
            {/* Divider with TORISETU */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className={`flex-1 h-px ${dividerColor}`}></div>
              <span
                className={`text-[8px] sm:text-[10px] ${textAccentMuted} tracking-[0.2em] sm:tracking-[0.3em]`}
              >
                TORISETU
              </span>
              <div className={`flex-1 h-px ${dividerColor}`}></div>
            </div>

            {/* Name */}
            <h2
              className="text-xl sm:text-2xl font-semibold text-gray-800 text-center mb-0.5 sm:mb-1 tracking-wide truncate max-w-full px-2"
              style={{ fontFamily: "serif" }}
              title={displayName}
            >
              {displayName}
            </h2>
            <p className="text-[8px] sm:text-[10px] text-gray-400 text-center tracking-[0.1em] sm:tracking-[0.15em] mb-4 sm:mb-6 truncate max-w-full px-2">
              {displayName}&apos;s Manual
            </p>

            {/* Stats Row */}
            <div className="flex items-center justify-between px-1 sm:px-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-xs text-gray-400">
                  Lv.
                </span>
                <span
                  className={`text-base sm:text-lg font-semibold ${textAccentLight}`}
                  style={{ fontFamily: "serif" }}
                >
                  {level}
                </span>
              </div>
              <div className="h-3 sm:h-4 w-px bg-gray-200"></div>
              <div className="text-center flex-1 px-1 sm:px-2">
                <span className="text-[8px] sm:text-[10px] text-gray-400 block">
                  RANK
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate block">
                  {currentRank.title}
                </span>
              </div>
              <div className="h-3 sm:h-4 w-px bg-gray-200"></div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-base sm:text-lg font-semibold ${textAccentLight}`}
                  style={{ fontFamily: "serif" }}
                >
                  {itemCount}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400">
                  items
                </span>
              </div>
            </div>
          </div>

          {/* Corner Accent */}
          <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 overflow-hidden">
            <div
              className={`absolute -top-6 -left-6 sm:-top-8 sm:-left-8 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${cornerGradient} rotate-45`}
            ></div>
          </div>
        </div>
      </motion.button>
    </>
  );
}

"use client";

interface RatingIconProps {
  rating: "good" | "neutral" | "bad";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: 20,
  md: 28,
  lg: 40,
};

export function RatingIcon({ rating, size = "md", className = "" }: RatingIconProps) {
  const s = sizeMap[size];
  const strokeWidth = size === "sm" ? 2 : 1.5;

  // モダンなカラーパレット
  const colors = {
    good: {
      bg: "#ECFDF5",
      stroke: "#10B981",
      fill: "#10B981",
    },
    neutral: {
      bg: "#FEF9C3",
      stroke: "#CA8A04",
      fill: "#CA8A04",
    },
    bad: {
      bg: "#FEE2E2",
      stroke: "#EF4444",
      fill: "#EF4444",
    },
  };

  const c = colors[rating];

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* 背景円 */}
      <circle cx="12" cy="12" r="11" fill={c.bg} />

      {/* 目 */}
      <circle cx="8" cy="10" r="1.5" fill={c.fill} />
      <circle cx="16" cy="10" r="1.5" fill={c.fill} />

      {/* 口 - 評価に応じて変化 */}
      {rating === "good" && (
        <path
          d="M8 15C8.5 16.5 10 18 12 18C14 18 15.5 16.5 16 15"
          stroke={c.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {rating === "neutral" && (
        <line
          x1="8"
          y1="16"
          x2="16"
          y2="16"
          stroke={c.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
      {rating === "bad" && (
        <path
          d="M8 17C8.5 15.5 10 14 12 14C14 14 15.5 15.5 16 17"
          stroke={c.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

// ボタンとして使うバージョン
interface RatingButtonProps {
  rating: "good" | "neutral" | "bad";
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function RatingButton({
  rating,
  selected = false,
  onClick,
  disabled = false,
}: RatingButtonProps) {
  const labels = {
    good: "良い",
    neutral: "普通",
    bad: "悪い",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-1 p-3 rounded-xl transition-all
        ${selected
          ? "bg-primary/10 ring-2 ring-primary scale-105"
          : "hover:bg-muted"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <RatingIcon rating={rating} size="lg" />
      <span className="text-xs text-muted-foreground">{labels[rating]}</span>
    </button>
  );
}

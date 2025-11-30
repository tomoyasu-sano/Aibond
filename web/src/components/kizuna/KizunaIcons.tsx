"use client";

interface IconProps {
  size?: number;
  className?: string;
}

// ========================================
// アイテムタイプアイコン
// ========================================

// 約束 - チェックリストアイコン
export function PromiseIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#DBEAFE" />
      <path
        d="M8 12L11 15L16 9"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 要望 - ハートハンドアイコン
export function RequestIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#F3E8FF" />
      <path
        d="M12 8C10.5 6.5 8 6.5 8 9C8 11 12 14 12 14C12 14 16 11 16 9C16 6.5 13.5 6.5 12 8Z"
        fill="#9333EA"
      />
      <path
        d="M8 16H16"
        stroke="#9333EA"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 自分の気持ち - 吹き出しアイコン
export function MyFeelingIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#DCFCE7" />
      <path
        d="M7 9H17M7 12H14"
        stroke="#16A34A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9 17L7 15H17L15 17"
        stroke="#16A34A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// 相手の気持ち - 思考吹き出しアイコン
export function PartnerFeelingIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#FCE7F3" />
      <circle cx="12" cy="11" r="4" stroke="#DB2777" strokeWidth="1.5" fill="none" />
      <circle cx="8" cy="17" r="1" fill="#DB2777" />
      <circle cx="6" cy="18" r="0.5" fill="#DB2777" />
    </svg>
  );
}

// メモ - ノートアイコン
export function MemoIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#F3F4F6" />
      <path
        d="M8 8H16M8 12H16M8 16H13"
        stroke="#6B7280"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// タイプアイコンをまとめて取得
export function ItemTypeIcon({ type, size = 20, className = "" }: { type: string } & IconProps) {
  switch (type) {
    case "promise":
      return <PromiseIcon size={size} className={className} />;
    case "request":
      return <RequestIcon size={size} className={className} />;
    case "my_feeling":
      return <MyFeelingIcon size={size} className={className} />;
    case "partner_feeling":
      return <PartnerFeelingIcon size={size} className={className} />;
    case "memo":
      return <MemoIcon size={size} className={className} />;
    default:
      return <MemoIcon size={size} className={className} />;
  }
}

// ========================================
// レビュー結果アイコン
// ========================================

// 達成 - チェックサークル
export function CompletedIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#DCFCE7" />
      <path
        d="M8 12L11 15L16 9"
        stroke="#16A34A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 継続 - 回転矢印
export function ContinueIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#DBEAFE" />
      <path
        d="M16 12C16 9.79 14.21 8 12 8C10.5 8 9.18 8.78 8.45 10"
        stroke="#2563EB"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 12C8 14.21 9.79 16 12 16C13.5 16 14.82 15.22 15.55 14"
        stroke="#2563EB"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M8.5 7.5L8.45 10L11 9.5" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 16.5L15.55 14L13 14.5" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 修正 - 鉛筆
export function ModifiedIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#FEF9C3" />
      <path
        d="M14.5 7.5L16.5 9.5L10 16H8V14L14.5 7.5Z"
        stroke="#CA8A04"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 断念 - ×印
export function AbandonedIcon({ size = 20, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#F3F4F6" />
      <path
        d="M9 9L15 15M15 9L9 15"
        stroke="#6B7280"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// レビュー結果アイコンをまとめて取得
export function ReviewResultIcon({ result, size = 20, className = "" }: { result: string } & IconProps) {
  switch (result) {
    case "completed":
      return <CompletedIcon size={size} className={className} />;
    case "continue":
      return <ContinueIcon size={size} className={className} />;
    case "modified":
      return <ModifiedIcon size={size} className={className} />;
    case "abandoned":
      return <AbandonedIcon size={size} className={className} />;
    default:
      return null;
  }
}

// ========================================
// テーマステータスアイコン
// ========================================

// 継続中 - フォルダ
export function ActiveTopicIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
        fill="#DBEAFE"
        stroke="#2563EB"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// 解決済み - チェック付きフォルダ
export function ResolvedTopicIcon({ size = 24, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
        fill="#DCFCE7"
        stroke="#16A34A"
        strokeWidth="1.5"
      />
      <path
        d="M9 13L11 15L15 11"
        stroke="#16A34A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// テーマステータスアイコン
export function TopicStatusIcon({ status, size = 24, className = "" }: { status: string } & IconProps) {
  if (status === "resolved") {
    return <ResolvedTopicIcon size={size} className={className} />;
  }
  return <ActiveTopicIcon size={size} className={className} />;
}

// ========================================
// UIアイコン
// ========================================

// レビュー待ち - 時計
export function ReviewDueIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="#EA580C" strokeWidth="2" fill="#FFF7ED" />
      <path d="M12 7V12L15 14" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 振り返り - グラフ
export function HistoryIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#EDE9FE" />
      <path d="M7 16V12M12 16V8M17 16V10" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// お祝い - スター
export function CelebrateIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L14.09 8.26L21 9.27L16 13.97L17.18 21L12 17.77L6.82 21L8 13.97L3 9.27L9.91 8.26L12 2Z"
        fill="#FEF08A"
        stroke="#CA8A04"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// レビュー - クリップボード
export function ReviewIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#F0FDF4" stroke="#16A34A" strokeWidth="1.5" />
      <path d="M9 3V5H15V3" stroke="#16A34A" strokeWidth="1.5" />
      <path d="M9 10H15M9 14H13" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 再開 - 再生
export function ReopenIcon({ size = 16, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1.5" />
      <path d="M10 8L16 12L10 16V8Z" fill="#2563EB" />
    </svg>
  );
}

// 空状態アイコン
export function EmptyStateIcon({ size = 64, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#F3F4F6" />
      <path d="M8 9H16M8 12H14M8 15H12" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="17" r="4" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1.5" />
      <path d="M17 15V19M15 17H19" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 振り返り空状態
export function EmptyHistoryIcon({ size = 64, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#F3F4F6" />
      <path d="M7 17V14M12 17V10M17 17V12" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

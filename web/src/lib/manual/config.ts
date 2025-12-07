/**
 * Manual (取説) Configuration
 * 達成レベル、カテゴリ、色などの設定を一元管理
 */

import { Target, Heart, Palette, MessageCircle, Home, FileText, LucideIcon } from 'lucide-react';

// カテゴリ定義
export const MANUAL_CATEGORIES = {
  basic: {
    id: 'basic',
    name: '基本情報',
    icon: Target,
    defaultColor: '#F5E6D3',
  },
  personality: {
    id: 'personality',
    name: '性格・気持ち',
    icon: Heart,
    defaultColor: '#FFB6B9',
  },
  hobbies: {
    id: 'hobbies',
    name: '趣味・好み',
    icon: Palette,
    defaultColor: '#A8D8EA',
  },
  communication: {
    id: 'communication',
    name: 'コミュニケーション',
    icon: MessageCircle,
    defaultColor: '#C1E1C1',
  },
  lifestyle: {
    id: 'lifestyle',
    name: '生活習慣',
    icon: Home,
    defaultColor: '#FFEFBA',
  },
  other: {
    id: 'other',
    name: 'その他',
    icon: FileText,
    defaultColor: '#E8E8E8',
  },
} as const;

// 固定質問（基本情報）
export const FIXED_QUESTIONS = [
  { category: 'basic', question: '好きな色' },
  { category: 'basic', question: '好きな音楽・アーティスト' },
  { category: 'basic', question: '嫌いな食べ物' },
  { category: 'basic', question: '大切にしている価値観' },
  { category: 'basic', question: '絶対に許せないこと' },
] as const;

// オンボーディング用の質問（初回5問）
export const ONBOARDING_QUESTIONS = [
  { category: 'basic', question: '誕生日は？', placeholder: '例: 1月1日' },
  { category: 'basic', question: '血液型は？', placeholder: '例: A型' },
  { category: 'hobbies', question: '好きな食べ物は？', placeholder: '例: お寿司、ラーメン' },
  { category: 'hobbies', question: '苦手な食べ物は？', placeholder: '例: なす、ピーマン' },
  { category: 'lifestyle', question: '朝型？夜型？', placeholder: '例: 朝型です' },
] as const;

// ランク設定（5段階）
export const RANK_TIERS = [
  {
    id: 'beginner',
    minItems: 1,
    maxItems: 19,
    title: 'ビギナー',
    message: '取説づくりをスタート！',
  },
  {
    id: 'apprentice',
    minItems: 20,
    maxItems: 49,
    title: '見習い',
    message: 'もっと知っていこう！',
  },
  {
    id: 'master',
    minItems: 50,
    maxItems: 99,
    title: 'マスター',
    message: '素晴らしい理解度です！',
  },
  {
    id: 'expert',
    minItems: 100,
    maxItems: 169,
    title: 'エキスパート',
    message: 'パートナーへの理解が深い！',
  },
  {
    id: 'legend',
    minItems: 170,
    maxItems: Infinity,
    title: 'レジェンド',
    message: '最高レベルの理解者！',
  },
] as const;

// レベル計算: 項目数 ÷ 2（2項目ごとに1レベル）
export function calculateLevel(itemCount: number): number {
  return Math.max(1, Math.floor(itemCount / 2));
}

// 後方互換性のため維持（非推奨）
export const ACHIEVEMENT_LEVELS = RANK_TIERS;

// 達成バッジ設定（アイコンなし、シンプルなデザイン）
export const ACHIEVEMENT_BADGES = [
  {
    id: 'first_item',
    title: '初めての1冊',
    description: '最初の項目を追加しました',
    condition: (count: number) => count >= 1,
  },
  {
    id: 'ten_items',
    title: '10項目達成',
    description: '10項目を追加しました',
    condition: (count: number) => count >= 10,
  },
  {
    id: 'twenty_items',
    title: '20項目達成',
    description: '見習いランクに到達',
    condition: (count: number) => count >= 20,
  },
  {
    id: 'fifty_items',
    title: '50項目達成',
    description: 'マスターランクに到達',
    condition: (count: number) => count >= 50,
  },
  {
    id: 'hundred_items',
    title: '100項目達成',
    description: 'エキスパートランクに到達',
    condition: (count: number) => count >= 100,
  },
] as const;

// 現在のランクを取得
export function getCurrentRank(itemCount: number) {
  if (itemCount === 0) {
    return { ...RANK_TIERS[0], title: 'ビギナー' }; // 0項目でもビギナー表示
  }
  return (
    RANK_TIERS.find(
      (tier) => itemCount >= tier.minItems && itemCount <= tier.maxItems
    ) || RANK_TIERS[RANK_TIERS.length - 1]
  );
}

// 後方互換性のため維持
export function getCurrentLevel(itemCount: number) {
  return getCurrentRank(itemCount);
}

// 次のランクまでの残り項目数を取得
export function getItemsToNextRank(itemCount: number) {
  const currentRank = getCurrentRank(itemCount);
  const currentIndex = RANK_TIERS.findIndex(
    (tier) => tier.id === currentRank.id
  );
  const nextRank = RANK_TIERS[currentIndex + 1];

  if (!nextRank) {
    return null; // 最高ランク（レジェンド）到達
  }

  return nextRank.minItems - itemCount;
}

// 後方互換性のため維持
export function getItemsToNextLevel(itemCount: number) {
  return getItemsToNextRank(itemCount);
}

// 次のレベルまでの残り項目数（2項目ごとに1レベル）
export function getItemsToNextNumericLevel(itemCount: number) {
  const currentLevel = calculateLevel(itemCount);
  const nextLevelItems = (currentLevel + 1) * 2;
  return nextLevelItems - itemCount;
}

// 新しく獲得したバッジを取得
export function getNewBadges(oldCount: number, newCount: number) {
  return ACHIEVEMENT_BADGES.filter(
    (badge) => !badge.condition(oldCount) && badge.condition(newCount)
  );
}

// 新しいランクに到達したかチェック
export function getNewRank(oldCount: number, newCount: number) {
  const oldRank = getCurrentRank(oldCount);
  const newRank = getCurrentRank(newCount);
  if (oldRank.id !== newRank.id) {
    return newRank;
  }
  return null;
}

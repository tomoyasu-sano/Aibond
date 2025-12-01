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

export type ManualCategory = keyof typeof MANUAL_CATEGORIES;

// 固定質問（基本情報）
export const FIXED_QUESTIONS = [
  { category: 'basic', question: '好きな色' },
  { category: 'basic', question: '好きな音楽・アーティスト' },
  { category: 'basic', question: '嫌いな食べ物' },
  { category: 'basic', question: '大切にしている価値観' },
  { category: 'basic', question: '絶対に許せないこと' },
] as const;

// 達成レベル設定（修正可能）
export const ACHIEVEMENT_LEVELS = [
  {
    level: 1,
    minItems: 1,
    maxItems: 5,
    title: '取説ビギナー',
    emoji: '🌱',
    message: '取説づくりをスタート！',
  },
  {
    level: 2,
    minItems: 6,
    maxItems: 10,
    title: '取説見習い',
    emoji: '🌿',
    message: 'もっと知っていこう！',
  },
  {
    level: 3,
    minItems: 11,
    maxItems: 20,
    title: '取説マスター見習い',
    emoji: '🌳',
    message: '順調に成長しています！',
  },
  {
    level: 4,
    minItems: 21,
    maxItems: 30,
    title: '取説マスター',
    emoji: '🏆',
    message: '素晴らしい理解度です！',
  },
  {
    level: 5,
    minItems: 31,
    maxItems: 50,
    title: '取説エキスパート',
    emoji: '⭐',
    message: 'パートナーへの理解が深い！',
  },
  {
    level: 6,
    minItems: 51,
    maxItems: 100,
    title: '取説レジェンド',
    emoji: '💎',
    message: '最高レベルの理解者！',
  },
] as const;

// 達成バッジ設定
export const ACHIEVEMENT_BADGES = [
  {
    id: 'first_item',
    title: '初めての1冊',
    description: '最初の項目を追加しました',
    emoji: '🎉',
    condition: (count: number) => count >= 1,
  },
  {
    id: 'basic_complete',
    title: '基本情報コンプリート',
    description: '基本情報をすべて埋めました',
    emoji: '✨',
    condition: (count: number, category?: string) => category === 'basic' && count >= 5,
  },
  {
    id: 'ten_items',
    title: '10冊達成',
    description: '10項目を追加しました',
    emoji: '🏅',
    condition: (count: number) => count >= 10,
  },
  {
    id: 'twenty_items',
    title: '20冊達成',
    description: '20項目を追加しました',
    emoji: '🏆',
    condition: (count: number) => count >= 20,
  },
  {
    id: 'fifty_items',
    title: '50冊達成',
    description: '50項目を追加しました',
    emoji: '⭐',
    condition: (count: number) => count >= 50,
  },
] as const;

// 現在のレベルを取得
export function getCurrentLevel(itemCount: number) {
  return (
    ACHIEVEMENT_LEVELS.find(
      (level) => itemCount >= level.minItems && itemCount <= level.maxItems
    ) || ACHIEVEMENT_LEVELS[ACHIEVEMENT_LEVELS.length - 1]
  );
}

// 次のレベルまでの残り項目数を取得
export function getItemsToNextLevel(itemCount: number) {
  const currentLevel = getCurrentLevel(itemCount);
  const currentLevelIndex = ACHIEVEMENT_LEVELS.findIndex(
    (level) => level.level === currentLevel.level
  );
  const nextLevel = ACHIEVEMENT_LEVELS[currentLevelIndex + 1];

  if (!nextLevel) {
    return null; // 最高レベル到達
  }

  return nextLevel.minItems - itemCount;
}

// 新しく獲得したバッジを取得
export function getNewBadges(oldCount: number, newCount: number) {
  return ACHIEVEMENT_BADGES.filter(
    (badge) => !badge.condition(oldCount) && badge.condition(newCount)
  );
}

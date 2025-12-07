// Database types based on Supabase schema

export type PlanType = "free" | "standard" | "premium";

export type LanguageCode =
  | "ja" // 日本語
  | "en" // English
  | "zh" // 中文
  | "ko" // 한국어
  | "es" // Español
  | "pt"; // Português

export const LANGUAGES: { code: LanguageCode; name: string; nativeName: string }[] = [
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
];

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  language: LanguageCode;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Usage {
  id: string;
  user_id: string;
  year_month: string;
  talk_minutes: number;
  ai_consultation_count: number;
  created_at: string;
  updated_at: string;
}

export interface Partnership {
  id: string;
  user1_id: string;
  user2_id: string;
  partnership_name: string | null;
  status: "active" | "unlinked";
  created_at: string;
  updated_at: string;
}

export interface PartnerInvitation {
  id: string;
  inviter_id: string;
  invite_code: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export interface Talk {
  id: string;
  partnership_id: string;
  started_by: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  summary: string | null;
  status: "recording" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface TalkMessage {
  id: string;
  talk_id: string;
  speaker_id: string | null;
  speaker_label: string | null;
  original_text: string;
  original_language: LanguageCode;
  translated_text: string | null;
  translated_language: LanguageCode | null;
  timestamp_ms: number;
  created_at: string;
}

export interface Promise {
  id: string;
  talk_id: string | null;
  partnership_id: string;
  created_by: string;
  content: string;
  due_date: string | null;
  status: "pending" | "completed" | "cancelled";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIConsultation {
  id: string;
  user_id: string;
  partnership_id: string | null;
  title: string | null;
  messages: AIConsultationMessage[];
  created_at: string;
  updated_at: string;
}

export interface AIConsultationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Plan limits
export const PLAN_LIMITS: Record<PlanType, { minutes: number; label: string }> = {
  free: { minutes: 120, label: "月2時間" },
  standard: { minutes: 900, label: "月15時間" },
  premium: { minutes: -1, label: "無制限" },
};

// Talk Sentiment Analysis
export type SentimentStatus = "completed" | "insufficient_data" | "failed";
export type SkipReason = "too_few_sentences" | "too_short" | "single_speaker" | null;
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface TalkSentimentInsights {
  goodPoints: string[];
  concerns: string[];
  suggestions: string[];
  comparisonWithPrevious: string;
  overallComment: string;
}

export interface TalkSentiment {
  id: string;
  talk_id: string;
  partnership_id: string | null;
  status: SentimentStatus;
  skip_reason: SkipReason;
  // 感情バランス（%）
  positive_ratio: number | null;
  neutral_ratio: number | null;
  negative_ratio: number | null;
  // 話者別感情バランス
  user1_positive_ratio: number | null;
  user1_negative_ratio: number | null;
  user2_positive_ratio: number | null;
  user2_negative_ratio: number | null;
  // 生データ
  raw_volatility_stddev: number | null;
  sentence_count: number | null;
  total_characters: number | null;
  // スコア（1-10）
  volatility_score: number | null;
  constructiveness_score: number | null;
  understanding_score: number | null;
  overall_score: number | null;
  // AI生成コメント
  ai_insights: TalkSentimentInsights | null;
  // メタデータ
  talk_duration_minutes: number | null;
  talk_time_of_day: TimeOfDay | null;
  talk_day_of_week: number | null;
  // 分析情報
  analyzed_at: string;
  analysis_version: string;
  analysis_language: string | null;
  created_at: string;
}

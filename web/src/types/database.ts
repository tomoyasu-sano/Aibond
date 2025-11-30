// Database types based on Supabase schema

export type PlanType = "free" | "standard" | "premium";

export type LanguageCode =
  | "ja" // 日本語
  | "en" // English
  | "zh" // 中文
  | "ko" // 한국어
  | "es" // Español
  | "fr" // Français
  | "de" // Deutsch
  | "pt" // Português
  | "vi" // Tiếng Việt
  | "th" // ไทย
  | "id" // Bahasa Indonesia
  | "tl"; // Filipino

export const LANGUAGES: { code: LanguageCode; name: string; nativeName: string }[] = [
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "tl", name: "Filipino", nativeName: "Filipino" },
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

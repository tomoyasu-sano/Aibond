-- ============================================================
-- Aibond Database Schema
-- Version: 1.0
-- Created: 2025-11-29
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. user_profiles - ユーザープロフィール
-- ============================================================
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ja', -- "ja", "en", "ko", "zh" など（Google対応言語）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. subscriptions - サブスクリプション（個人単位）
-- ============================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free', -- "free", "standard", "premium"
  status TEXT NOT NULL DEFAULT 'active', -- "active", "canceled", "past_due"
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  scheduled_plan TEXT, -- ダウングレード予約時の次回適用プラン
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_plan CHECK(plan IN ('free', 'standard', 'premium')),
  CONSTRAINT valid_status CHECK(status IN ('active', 'canceled', 'past_due')),
  CONSTRAINT valid_scheduled_plan CHECK(scheduled_plan IS NULL OR scheduled_plan IN ('free', 'standard', 'premium'))
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- ============================================================
-- 3. usage - 使用量管理（個人単位）
-- ============================================================
CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- "2025-11"（YYYY-MM）
  minutes_used INTEGER NOT NULL DEFAULT 0,
  minutes_limit INTEGER NOT NULL DEFAULT 120, -- Free: 2時間
  notified_80 BOOLEAN NOT NULL DEFAULT false,
  notified_100 BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_period UNIQUE(user_id, period)
);

CREATE INDEX idx_usage_user ON usage(user_id);
CREATE INDEX idx_usage_period ON usage(period);

-- ============================================================
-- 4. partnerships - パートナー連携
-- ============================================================
CREATE TABLE public.partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_name TEXT, -- 例: "太郎 & Sarah"
  main_language TEXT NOT NULL, -- 会話で使う言語
  sub_language TEXT, -- 翻訳先の言語（NULLの場合は翻訳OFF）
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'unlinked'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_partnership UNIQUE(user1_id, user2_id),
  CONSTRAINT different_users CHECK(user1_id != user2_id),
  CONSTRAINT valid_status CHECK(status IN ('active', 'unlinked'))
);

CREATE INDEX idx_partnerships_user1 ON partnerships(user1_id);
CREATE INDEX idx_partnerships_user2 ON partnerships(user2_id);
CREATE INDEX idx_partnerships_status ON partnerships(status);

-- ============================================================
-- 5. partner_invitations - パートナー招待
-- ============================================================
CREATE TABLE public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- "pending", "accepted", "expired"
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK(status IN ('pending', 'accepted', 'expired'))
);

CREATE INDEX idx_invitations_code ON partner_invitations(invite_code);
CREATE INDEX idx_invitations_inviter ON partner_invitations(inviter_id);

-- ============================================================
-- 6. talks - トーク（会話セッション）
-- ============================================================
CREATE TABLE public.talks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'active', -- "active", "paused", "completed"
  is_paused BOOLEAN DEFAULT FALSE,
  paused_at TIMESTAMP WITH TIME ZONE,
  total_pause_seconds INTEGER DEFAULT 0,
  summary TEXT,
  summary_status TEXT DEFAULT 'pending', -- "pending", "generated", "skipped", "failed"
  promises JSONB,
  next_topics JSONB,
  -- 話者マッピング
  speaker1_user_id UUID REFERENCES auth.users(id),
  speaker2_user_id UUID REFERENCES auth.users(id),
  speaker1_name TEXT,
  speaker2_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK(status IN ('active', 'paused', 'completed')),
  CONSTRAINT valid_summary_status CHECK(summary_status IN ('pending', 'generated', 'skipped', 'failed'))
);

CREATE INDEX idx_talks_owner ON talks(owner_user_id);
CREATE INDEX idx_talks_partnership ON talks(partnership_id);
CREATE INDEX idx_talks_started ON talks(started_at DESC);
CREATE INDEX idx_talks_status ON talks(status);

-- ============================================================
-- 7. talk_messages - トークメッセージ
-- ============================================================
CREATE TABLE public.talk_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talk_id UUID NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  speaker_tag INTEGER NOT NULL, -- 1 or 2 (STTからの話者識別)
  original_text TEXT NOT NULL,
  original_language TEXT NOT NULL,
  translated_text TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_final BOOLEAN DEFAULT TRUE,

  CONSTRAINT non_empty_text CHECK(length(original_text) > 0),
  CONSTRAINT valid_speaker_tag CHECK(speaker_tag IN (1, 2))
);

CREATE INDEX idx_messages_talk ON talk_messages(talk_id);
CREATE INDEX idx_messages_timestamp ON talk_messages(timestamp);

-- ============================================================
-- 8. promises - 約束リスト
-- ============================================================
CREATE TABLE public.promises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
  talk_id UUID REFERENCES talks(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT non_empty_content CHECK(length(content) > 0)
);

CREATE INDEX idx_promises_owner ON promises(owner_user_id);
CREATE INDEX idx_promises_partnership ON promises(partnership_id);
CREATE INDEX idx_promises_completed ON promises(is_completed);
CREATE INDEX idx_promises_created ON promises(created_at DESC);
CREATE INDEX idx_promises_manual ON promises(is_manual);

-- ============================================================
-- 9. ai_consultations - AI相談
-- ============================================================
CREATE TABLE public.ai_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consultations_user ON ai_consultations(user_id);

-- ============================================================
-- 10. ai_consultation_usage - AI相談使用量
-- ============================================================
CREATE TABLE public.ai_consultation_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  message_limit INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_consultation_user_period UNIQUE(user_id, period)
);

CREATE INDEX idx_consultation_usage_user ON ai_consultation_usage(user_id);
CREATE INDEX idx_consultation_usage_period ON ai_consultation_usage(period);

-- ============================================================
-- 11. audio_files - 音声ファイル
-- ============================================================
CREATE TABLE public.audio_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talk_id UUID NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration_seconds INTEGER,
  codec TEXT DEFAULT 'webm_opus',
  content_type TEXT DEFAULT 'audio/webm',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_talk_audio UNIQUE(talk_id)
);

CREATE INDEX idx_audio_files_talk ON audio_files(talk_id);

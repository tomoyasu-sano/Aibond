-- 話し合い分析（感情分析）テーブル
-- 会話の感情バランス、起伏度、建設性、相互理解度を保存

CREATE TABLE IF NOT EXISTS talk_sentiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_id UUID NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES partnerships(id),

  -- 分析ステータス
  status TEXT NOT NULL DEFAULT 'completed',
  -- 'completed' | 'insufficient_data' | 'failed'
  skip_reason TEXT, -- 'too_few_sentences' | 'too_short' | 'single_speaker' | null

  -- 感情バランス（%）- status='completed'の場合のみ
  positive_ratio NUMERIC(5,2),
  neutral_ratio NUMERIC(5,2),
  negative_ratio NUMERIC(5,2),

  -- 話者別感情バランス
  user1_positive_ratio NUMERIC(5,2),
  user1_negative_ratio NUMERIC(5,2),
  user2_positive_ratio NUMERIC(5,2),
  user2_negative_ratio NUMERIC(5,2),

  -- 生データ（しきい値調整用に保存）
  raw_volatility_stddev NUMERIC(6,4),
  sentence_count INTEGER,
  total_characters INTEGER,

  -- スコア（1-10）
  volatility_score INTEGER CHECK (volatility_score IS NULL OR volatility_score BETWEEN 1 AND 10),
  constructiveness_score INTEGER CHECK (constructiveness_score IS NULL OR constructiveness_score BETWEEN 1 AND 10),
  understanding_score INTEGER CHECK (understanding_score IS NULL OR understanding_score BETWEEN 1 AND 10),

  -- 総合スコア（計算フィールド）
  -- PostgreSQLのGENERATED ALWAYSを使用
  overall_score NUMERIC(3,1) GENERATED ALWAYS AS (
    CASE
      WHEN constructiveness_score IS NOT NULL
           AND understanding_score IS NOT NULL
           AND volatility_score IS NOT NULL
      THEN ROUND((constructiveness_score + understanding_score + (11 - volatility_score)) / 3.0, 1)
      ELSE NULL
    END
  ) STORED,

  -- AI生成コメント
  ai_insights JSONB,
  -- {
  --   "goodPoints": ["...", "..."],
  --   "concerns": ["...", "..."],
  --   "suggestions": ["...", "..."],
  --   "comparisonWithPrevious": "前回と比べて...",
  --   "overallComment": "..."
  -- }

  -- メタデータ
  talk_duration_minutes INTEGER,
  talk_time_of_day TEXT, -- 'morning' | 'afternoon' | 'evening' | 'night'
  talk_day_of_week INTEGER, -- 0-6 (Sunday-Saturday)

  -- 分析情報
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_version TEXT DEFAULT 'v1',
  analysis_language TEXT, -- 'ja' | 'en'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(talk_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_talk_sentiments_talk_id ON talk_sentiments(talk_id);
CREATE INDEX IF NOT EXISTS idx_talk_sentiments_partnership_id ON talk_sentiments(partnership_id);
CREATE INDEX IF NOT EXISTS idx_talk_sentiments_created_at ON talk_sentiments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_talk_sentiments_status ON talk_sentiments(status);

-- RLS設定
ALTER TABLE talk_sentiments ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のパートナーシップに属する分析結果のみ閲覧可能
CREATE POLICY "Users can view own partnership sentiments"
  ON talk_sentiments FOR SELECT
  USING (
    partnership_id IN (
      SELECT id FROM partnerships
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- 挿入はサービスロールのみ（API経由）
CREATE POLICY "Service role can manage sentiments"
  ON talk_sentiments FOR ALL
  USING (true)
  WITH CHECK (true);

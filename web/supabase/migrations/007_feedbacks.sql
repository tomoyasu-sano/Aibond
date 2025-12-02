-- フィードバックテーブル
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  rating TEXT CHECK (rating IS NULL OR rating IN ('love', 'good', 'neutral', 'bad', 'terrible')),
  category TEXT CHECK (category IS NULL OR category IN ('idea', 'bug', 'question', 'praise')),
  message TEXT,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks(rating);

-- RLSを有効化
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 誰でも挿入可能（匿名フィードバックも受け付ける）
CREATE POLICY "Anyone can insert feedback"
  ON feedbacks FOR INSERT
  WITH CHECK (true);

-- 管理者のみ閲覧可能（Supabaseダッシュボードから確認）
-- 通常ユーザーは自分のフィードバックも見れない設計
CREATE POLICY "Service role can select feedback"
  ON feedbacks FOR SELECT
  USING (false);

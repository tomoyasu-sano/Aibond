-- =====================================================
-- 絆ノート（Kizuna Note）
-- 関係改善のための約束・習慣・要望管理システム
-- =====================================================

-- ============================================================
-- 1. kizuna_topics - テーマ（大項目）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kizuna_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  CONSTRAINT non_empty_title CHECK(length(title) > 0)
);

CREATE INDEX IF NOT EXISTS idx_kizuna_topics_partnership ON kizuna_topics(partnership_id);
CREATE INDEX IF NOT EXISTS idx_kizuna_topics_status ON kizuna_topics(status);
CREATE INDEX IF NOT EXISTS idx_kizuna_topics_created ON kizuna_topics(created_at DESC);

COMMENT ON TABLE kizuna_topics IS '絆ノートのテーマ（継続する課題）';

-- ============================================================
-- 2. kizuna_items - 項目（中項目）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kizuna_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES kizuna_topics(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('promise', 'request', 'my_feeling', 'partner_feeling', 'memo')) NOT NULL,
  content TEXT NOT NULL,
  assignee TEXT CHECK (assignee IN ('self', 'partner', 'both')), -- 約束/要望の場合のみ
  review_date DATE, -- 約束の見直し日
  review_period TEXT CHECK (review_period IN ('1week', '2weeks', '1month', '3months')),
  status TEXT CHECK (status IN ('active', 'completed', 'modified', 'abandoned')) DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT non_empty_content CHECK(length(content) > 0)
);

CREATE INDEX IF NOT EXISTS idx_kizuna_items_topic ON kizuna_items(topic_id);
CREATE INDEX IF NOT EXISTS idx_kizuna_items_type ON kizuna_items(type);
CREATE INDEX IF NOT EXISTS idx_kizuna_items_status ON kizuna_items(status);
CREATE INDEX IF NOT EXISTS idx_kizuna_items_created ON kizuna_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kizuna_items_review_date ON kizuna_items(review_date);

COMMENT ON TABLE kizuna_items IS '絆ノートの項目（約束、要望、気持ち、メモ）';
COMMENT ON COLUMN kizuna_items.type IS 'promise=約束, request=要望, my_feeling=自分の気持ち, partner_feeling=相手の気持ち, memo=話し合いメモ';
COMMENT ON COLUMN kizuna_items.assignee IS 'self=自分, partner=パートナー, both=両方';

-- ============================================================
-- 3. kizuna_feedbacks - 評価（約束・要望に対する）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kizuna_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES kizuna_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating TEXT CHECK (rating IN ('good', 'neutral', 'bad')) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kizuna_feedbacks_item ON kizuna_feedbacks(item_id);
CREATE INDEX IF NOT EXISTS idx_kizuna_feedbacks_user ON kizuna_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_kizuna_feedbacks_created ON kizuna_feedbacks(created_at DESC);

COMMENT ON TABLE kizuna_feedbacks IS 'パートナーからの評価';
COMMENT ON COLUMN kizuna_feedbacks.rating IS 'good=😊, neutral=😐, bad=😢';

-- ============================================================
-- 4. kizuna_reviews - レビュー履歴
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kizuna_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES kizuna_items(id) ON DELETE CASCADE,
  result TEXT CHECK (result IN ('completed', 'continue', 'modified', 'abandoned')) NOT NULL,
  note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kizuna_reviews_item ON kizuna_reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_kizuna_reviews_created ON kizuna_reviews(created_at DESC);

COMMENT ON TABLE kizuna_reviews IS 'レビュー履歴';
COMMENT ON COLUMN kizuna_reviews.result IS 'completed=達成, continue=継続, modified=修正, abandoned=断念';

-- ============================================================
-- 5. RLS ポリシー
-- ============================================================

-- kizuna_topics
ALTER TABLE kizuna_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view topics of their partnerships"
  ON kizuna_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = kizuna_topics.partnership_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create topics in their partnerships"
  ON kizuna_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = partnership_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update topics of their partnerships"
  ON kizuna_topics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = kizuna_topics.partnership_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete topics they created"
  ON kizuna_topics FOR DELETE
  USING (created_by = auth.uid());

-- kizuna_items
ALTER TABLE kizuna_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items of their topics"
  ON kizuna_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kizuna_topics
      JOIN partnerships ON partnerships.id = kizuna_topics.partnership_id
      WHERE kizuna_topics.id = kizuna_items.topic_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create items in their topics"
  ON kizuna_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kizuna_topics
      JOIN partnerships ON partnerships.id = kizuna_topics.partnership_id
      WHERE kizuna_topics.id = topic_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update items of their topics"
  ON kizuna_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM kizuna_topics
      JOIN partnerships ON partnerships.id = kizuna_topics.partnership_id
      WHERE kizuna_topics.id = kizuna_items.topic_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete items they created"
  ON kizuna_items FOR DELETE
  USING (created_by = auth.uid());

-- kizuna_feedbacks
ALTER TABLE kizuna_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedbacks of their items"
  ON kizuna_feedbacks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kizuna_items
      JOIN kizuna_topics ON kizuna_topics.id = kizuna_items.topic_id
      JOIN partnerships ON partnerships.id = kizuna_topics.partnership_id
      WHERE kizuna_items.id = kizuna_feedbacks.item_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create feedbacks"
  ON kizuna_feedbacks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kizuna_items
      JOIN kizuna_topics ON kizuna_topics.id = kizuna_items.topic_id
      JOIN partnerships ON partnerships.id = kizuna_topics.partnership_id
      WHERE kizuna_items.id = item_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own feedbacks"
  ON kizuna_feedbacks FOR DELETE
  USING (user_id = auth.uid());

-- kizuna_reviews
ALTER TABLE kizuna_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reviews of their items"
  ON kizuna_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kizuna_items
      JOIN kizuna_topics ON kizuna_topics.id = kizuna_items.topic_id
      JOIN partnerships ON partnerships.id = kizuna_topics.partnership_id
      WHERE kizuna_items.id = kizuna_reviews.item_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create reviews"
  ON kizuna_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kizuna_items
      JOIN kizuna_topics ON kizuna_topics.id = kizuna_items.topic_id
      JOIN partnerships ON partnerships.id = kizuna_topics.partnership_id
      WHERE kizuna_items.id = item_id
        AND partnerships.status = 'active'
        AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
    AND created_by = auth.uid()
  );

-- ============================================================
-- 6. Triggers for updated_at
-- ============================================================

CREATE TRIGGER update_kizuna_topics_updated_at
  BEFORE UPDATE ON kizuna_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kizuna_items_updated_at
  BEFORE UPDATE ON kizuna_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. 既存promisesデータの移行（もしあれば）
-- ============================================================
-- 注: 既存データがある場合は手動で移行してください
-- 移行後、promisesテーブルは削除可能ですが、MVPなのでそのまま残しておきます

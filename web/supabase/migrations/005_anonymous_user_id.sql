-- =====================================================
-- ai_consultations に anonymous_user_id カラム追加
-- アカウント削除後も同一ユーザーの相談履歴をグループ化するため
-- =====================================================

ALTER TABLE ai_consultations
ADD COLUMN IF NOT EXISTS anonymous_user_id UUID;

-- インデックス追加（グループ化クエリ用）
CREATE INDEX IF NOT EXISTS idx_ai_consultations_anonymous_user_id
ON ai_consultations(anonymous_user_id);

-- コメント
COMMENT ON COLUMN ai_consultations.anonymous_user_id IS
'アカウント削除後の匿名グループID。削除時に生成され、同一ユーザーの相談履歴をグループ化するために使用。';

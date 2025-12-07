-- ============================================================
-- 論理削除のためのhistory_deleted_atカラム追加
-- パートナーシップの履歴が「削除」されたことを示す
-- ============================================================

-- partnerships テーブルに history_deleted_at カラムを追加
ALTER TABLE public.partnerships
ADD COLUMN IF NOT EXISTS history_deleted_at TIMESTAMPTZ DEFAULT NULL;

-- コメント追加
COMMENT ON COLUMN partnerships.history_deleted_at IS '履歴削除日時（論理削除）。設定されている場合、関連データはユーザーに表示されない';

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_partnerships_history_deleted ON partnerships(history_deleted_at);

-- ============================================================
-- ai_consultations に deleted_at カラムを追加
-- ============================================================
ALTER TABLE public.ai_consultations
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN ai_consultations.deleted_at IS '削除日時（論理削除）';

CREATE INDEX IF NOT EXISTS idx_ai_consultations_deleted ON ai_consultations(deleted_at);

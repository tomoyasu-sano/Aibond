-- kizuna_topics に deleted_at カラムを追加（論理削除対応）

-- deleted_at カラムを追加
ALTER TABLE kizuna_topics
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- インデックスを追加（論理削除されていないレコードの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_kizuna_topics_deleted_at
ON kizuna_topics(deleted_at)
WHERE deleted_at IS NULL;

-- コメント追加
COMMENT ON COLUMN kizuna_topics.deleted_at IS '論理削除日時（NULLの場合は有効）';

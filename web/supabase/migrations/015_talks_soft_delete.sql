-- talks テーブルに deleted_at カラムを追加（論理削除対応）

-- deleted_at カラムを追加
ALTER TABLE talks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- インデックスを追加（論理削除されていないレコードの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_talks_deleted_at
ON talks(deleted_at)
WHERE deleted_at IS NULL;

-- コメント追加
COMMENT ON COLUMN talks.deleted_at IS '論理削除日時（NULLの場合は有効）';

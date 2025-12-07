-- ============================================================
-- 012_add_ready_status.sql
-- talks テーブルに ready ステータスを追加
-- ready: 録音待機中（新規作成直後、まだ録音開始していない状態）
-- ============================================================

-- 既存の制約を削除して再作成
ALTER TABLE public.talks DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE public.talks ADD CONSTRAINT valid_status CHECK(status IN ('ready', 'active', 'paused', 'completed'));

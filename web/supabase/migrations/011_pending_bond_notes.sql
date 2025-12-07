-- ============================================================
-- 011_pending_bond_notes.sql
-- 話し合い後に生成された絆ノート項目・取説項目を一時的に保存するカラム
-- ============================================================

-- talks テーブルに pending_bond_notes カラムを追加
ALTER TABLE public.talks
ADD COLUMN IF NOT EXISTS pending_bond_notes JSONB;

-- talks テーブルに pending_manual_items カラムを追加
ALTER TABLE public.talks
ADD COLUMN IF NOT EXISTS pending_manual_items JSONB;

-- コメント追加
COMMENT ON COLUMN public.talks.pending_bond_notes IS 'AI生成された絆ノート項目の一時保存。ユーザーが確認後にクリアされる。';
COMMENT ON COLUMN public.talks.pending_manual_items IS 'AI生成された取説項目の一時保存。ユーザーが確認後にクリアされる。';

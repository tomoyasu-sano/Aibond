-- ============================================
-- 絆ノート: 親子関係の追加
-- ============================================
-- 「約束」「要望」「検討」を親カードとし、
-- 「自分の気持ち」「相手の気持ち」「メモ」を子カードとして紐付ける

-- 1. parent_item_id カラムを追加
ALTER TABLE kizuna_items
ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES kizuna_items(id) ON DELETE CASCADE;

-- 2. インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_kizuna_items_parent_item_id
ON kizuna_items(parent_item_id);

-- 3. type に 'discussion' を追加するためのチェック制約を更新
-- 既存の制約があれば削除
ALTER TABLE kizuna_items DROP CONSTRAINT IF EXISTS kizuna_items_type_check;

-- 新しい制約を追加（discussion を含む）
ALTER TABLE kizuna_items ADD CONSTRAINT kizuna_items_type_check
CHECK (type IN ('promise', 'request', 'discussion', 'my_feeling', 'partner_feeling', 'memo'));

-- 4. 既存データのマイグレーション
-- 各トピック内で、気持ち・メモを最新の親カード（promise/request）に紐付け
-- 親カードがない場合は紐付けしない

DO $$
DECLARE
    topic_record RECORD;
    latest_parent_id UUID;
    child_type TEXT;
BEGIN
    -- 各トピックに対して処理
    FOR topic_record IN
        SELECT DISTINCT topic_id FROM kizuna_items
    LOOP
        -- そのトピック内で最新の親カード（promise または request）を取得
        SELECT id INTO latest_parent_id
        FROM kizuna_items
        WHERE topic_id = topic_record.topic_id
          AND type IN ('promise', 'request')
          AND parent_item_id IS NULL
        ORDER BY created_at DESC
        LIMIT 1;

        -- 親カードが存在する場合のみ、子カードを紐付け
        IF latest_parent_id IS NOT NULL THEN
            UPDATE kizuna_items
            SET parent_item_id = latest_parent_id
            WHERE topic_id = topic_record.topic_id
              AND type IN ('my_feeling', 'partner_feeling', 'memo')
              AND parent_item_id IS NULL;

            RAISE NOTICE 'Topic %: Linked children to parent %', topic_record.topic_id, latest_parent_id;
        ELSE
            RAISE NOTICE 'Topic %: No parent card found, skipping', topic_record.topic_id;
        END IF;
    END LOOP;
END $$;

-- 5. RLSポリシーは既存のものを継承（partnership_idベース）
-- 特に追加の設定は不要

-- ============================================
-- 確認用クエリ
-- ============================================
-- 親子関係を確認:
-- SELECT
--   p.id as parent_id,
--   p.type as parent_type,
--   p.content as parent_content,
--   c.id as child_id,
--   c.type as child_type,
--   c.content as child_content
-- FROM kizuna_items p
-- LEFT JOIN kizuna_items c ON c.parent_item_id = p.id
-- WHERE p.type IN ('promise', 'request', 'discussion')
-- ORDER BY p.created_at DESC, c.created_at;

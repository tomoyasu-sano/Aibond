-- フリープランの制限を120分から60分に変更するSQLスクリプト
-- 実行日: 2025-XX-XX
-- 注意: このスクリプトはSupabase SQL Editorで実行してください

-- 1. 既存のusageレコードでFreeプランのユーザーの制限を更新
UPDATE usage
SET
  minutes_limit = 60,
  updated_at = NOW()
WHERE minutes_limit = 120
  AND user_id IN (
    SELECT user_id
    FROM subscriptions
    WHERE plan = 'free'
  );

-- 2. トリガー関数の確認と更新（もし存在する場合）
-- 以下のクエリで、usageレコード作成時のトリガー関数を検索
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%120%'
  AND routine_type = 'FUNCTION'
  AND routine_schema = 'public';

-- 注意: 上記クエリで見つかったトリガー関数がある場合、
-- その関数内の120を60に手動で修正してください。

-- 3. 確認クエリ: 現在のFreeプランユーザーの使用量制限を表示
SELECT
  u.user_id,
  u.period,
  u.minutes_used,
  u.minutes_limit,
  s.plan
FROM usage u
JOIN subscriptions s ON u.user_id = s.user_id
WHERE s.plan = 'free'
ORDER BY u.period DESC, u.user_id;

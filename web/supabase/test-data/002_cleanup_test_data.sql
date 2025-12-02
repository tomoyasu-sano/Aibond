-- ============================================
-- テストデータ削除用スクリプト
-- ============================================
-- 注意: このスクリプトはテストで作成したデータを削除します
-- 本番データがある場合は実行しないでください
-- ============================================

-- talk_sentimentsを全削除（talksが削除されると自動削除されるので通常は不要）
-- DELETE FROM talk_sentiments;

-- 特定のサマリーを持つtalksを削除（テストデータのみ）
DELETE FROM talks WHERE summary LIKE '%家事の分担について%';
DELETE FROM talks WHERE summary LIKE '%休日の過ごし方について%';
DELETE FROM talks WHERE summary LIKE '%仕事と家庭のバランス%';
DELETE FROM talks WHERE summary LIKE '%週末の予定について%';
DELETE FROM talks WHERE summary LIKE '%将来の計画について%';
DELETE FROM talks WHERE summary = '短い会話でした。';
DELETE FROM talks WHERE summary LIKE '%最近の悩みについて%';

-- 確認
SELECT 'Remaining talks:' AS info, COUNT(*) AS count FROM talks;
SELECT 'Remaining sentiments:' AS info, COUNT(*) AS count FROM talk_sentiments;

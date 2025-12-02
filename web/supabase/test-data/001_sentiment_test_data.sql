-- ============================================
-- 話し合い分析 テストデータ
-- ============================================
-- 使用方法:
-- 1. まず008_talk_sentiments.sqlを実行してテーブル作成
-- 2. 下記の{YOUR_USER_ID}と{YOUR_PARTNERSHIP_ID}を実際の値に置き換える
-- 3. Supabaseダッシュボード > SQL Editor で実行
-- ============================================

-- ★★★ ここを自分の値に書き換えてください ★★★
-- user_profilesテーブルからidを確認: SELECT id FROM user_profiles LIMIT 1;
-- partnershipsテーブルからidを確認: SELECT id FROM partnerships LIMIT 1;

DO $$
DECLARE
  v_user_id UUID := 'd3ea32e1-c613-4ac8-92f1-8eea28d71275';  -- ← 置き換え
  v_partnership_id UUID := '355727ef-289c-4d57-bbb8-d005a38c3d2f';  -- ← 置き換え
  v_talk_id1 UUID;
  v_talk_id2 UUID;
  v_talk_id3 UUID;
  v_talk_id4 UUID;
  v_talk_id5 UUID;
  v_talk_id6 UUID;
  v_talk_id7 UUID;
BEGIN

  -- ============================================
  -- テスト用のtalksを作成（7件）
  -- ============================================

  -- Talk 1: 7日前
  INSERT INTO talks (
    owner_user_id, partnership_id, status, started_at, ended_at,
    duration_minutes, summary, summary_status,
    speaker1_name, speaker2_name
  ) VALUES (
    v_user_id, v_partnership_id, 'completed',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '25 minutes',
    25, '家事の分担について話し合いました。お互いの得意な家事を担当することで合意しました。',
    'generated', '自分', 'パートナー'
  ) RETURNING id INTO v_talk_id1;

  -- Talk 2: 14日前
  INSERT INTO talks (
    owner_user_id, partnership_id, status, started_at, ended_at,
    duration_minutes, summary, summary_status,
    speaker1_name, speaker2_name
  ) VALUES (
    v_user_id, v_partnership_id, 'completed',
    NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '40 minutes',
    40, '休日の過ごし方について話しました。月に一度は二人でお出かけすることを約束しました。',
    'generated', '自分', 'パートナー'
  ) RETURNING id INTO v_talk_id2;

  -- Talk 3: 21日前
  INSERT INTO talks (
    owner_user_id, partnership_id, status, started_at, ended_at,
    duration_minutes, summary, summary_status,
    speaker1_name, speaker2_name
  ) VALUES (
    v_user_id, v_partnership_id, 'completed',
    NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days' + INTERVAL '35 minutes',
    35, '仕事と家庭のバランスについて話し合いました。少し感情的になる場面もありました。',
    'generated', '自分', 'パートナー'
  ) RETURNING id INTO v_talk_id3;

  -- Talk 4: 28日前
  INSERT INTO talks (
    owner_user_id, partnership_id, status, started_at, ended_at,
    duration_minutes, summary, summary_status,
    speaker1_name, speaker2_name
  ) VALUES (
    v_user_id, v_partnership_id, 'completed',
    NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days' + INTERVAL '20 minutes',
    20, '週末の予定について簡単に話しました。',
    'generated', '自分', 'パートナー'
  ) RETURNING id INTO v_talk_id4;

  -- Talk 5: 35日前
  INSERT INTO talks (
    owner_user_id, partnership_id, status, started_at, ended_at,
    duration_minutes, summary, summary_status,
    speaker1_name, speaker2_name
  ) VALUES (
    v_user_id, v_partnership_id, 'completed',
    NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days' + INTERVAL '50 minutes',
    50, '将来の計画について深く話し合いました。お互いの夢や目標を共有できました。',
    'generated', '自分', 'パートナー'
  ) RETURNING id INTO v_talk_id5;

  -- Talk 6: 42日前（データ不足）
  INSERT INTO talks (
    owner_user_id, partnership_id, status, started_at, ended_at,
    duration_minutes, summary, summary_status,
    speaker1_name, speaker2_name
  ) VALUES (
    v_user_id, v_partnership_id, 'completed',
    NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days' + INTERVAL '5 minutes',
    5, '短い会話でした。',
    'generated', '自分', 'パートナー'
  ) RETURNING id INTO v_talk_id6;

  -- Talk 7: 3日前（最新）
  INSERT INTO talks (
    owner_user_id, partnership_id, status, started_at, ended_at,
    duration_minutes, summary, summary_status,
    speaker1_name, speaker2_name
  ) VALUES (
    v_user_id, v_partnership_id, 'completed',
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '30 minutes',
    30, '最近の悩みについて話しました。お互いをサポートすることを再確認しました。',
    'generated', '自分', 'パートナー'
  ) RETURNING id INTO v_talk_id7;

  -- ============================================
  -- talk_sentiments テストデータ
  -- ============================================

  -- Sentiment 1: 7日前（良好な会話）
  INSERT INTO talk_sentiments (
    talk_id, partnership_id, status, skip_reason,
    positive_ratio, neutral_ratio, negative_ratio,
    user1_positive_ratio, user1_negative_ratio,
    user2_positive_ratio, user2_negative_ratio,
    raw_volatility_stddev, sentence_count, total_characters,
    volatility_score, constructiveness_score, understanding_score,
    ai_insights,
    talk_duration_minutes, talk_time_of_day, talk_day_of_week,
    analyzed_at, analysis_version, analysis_language
  ) VALUES (
    v_talk_id1, v_partnership_id, 'completed', NULL,
    45.5, 42.0, 12.5,
    50.0, 10.0,
    40.0, 15.0,
    0.1250, 28, 1250,
    3, 8, 7,
    '{
      "goodPoints": ["お互いの得意分野を認め合えています", "具体的な解決策を出し合えました"],
      "concerns": [],
      "suggestions": ["定期的に分担を見直すのも良いかもしれません"],
      "comparisonWithPrevious": "前回より建設的な話し合いができています",
      "overallComment": "お互いを尊重した建設的な話し合いでした"
    }'::jsonb,
    25, 'evening', 0,
    NOW() - INTERVAL '7 days', 'v1', 'ja'
  );

  -- Sentiment 2: 14日前（とても良好）
  INSERT INTO talk_sentiments (
    talk_id, partnership_id, status, skip_reason,
    positive_ratio, neutral_ratio, negative_ratio,
    user1_positive_ratio, user1_negative_ratio,
    user2_positive_ratio, user2_negative_ratio,
    raw_volatility_stddev, sentence_count, total_characters,
    volatility_score, constructiveness_score, understanding_score,
    ai_insights,
    talk_duration_minutes, talk_time_of_day, talk_day_of_week,
    analyzed_at, analysis_version, analysis_language
  ) VALUES (
    v_talk_id2, v_partnership_id, 'completed', NULL,
    55.0, 38.0, 7.0,
    58.0, 5.0,
    52.0, 9.0,
    0.0850, 42, 1850,
    2, 9, 8,
    '{
      "goodPoints": ["前向きな提案が多く出ました", "お互いの希望をしっかり聞き合えています", "具体的な約束ができました"],
      "concerns": [],
      "suggestions": ["約束を守れたかの振り返りもしてみましょう"],
      "comparisonWithPrevious": "",
      "overallComment": "とても良い雰囲気の話し合いでした"
    }'::jsonb,
    40, 'afternoon', 6,
    NOW() - INTERVAL '14 days', 'v1', 'ja'
  );

  -- Sentiment 3: 21日前（やや感情的）
  INSERT INTO talk_sentiments (
    talk_id, partnership_id, status, skip_reason,
    positive_ratio, neutral_ratio, negative_ratio,
    user1_positive_ratio, user1_negative_ratio,
    user2_positive_ratio, user2_negative_ratio,
    raw_volatility_stddev, sentence_count, total_characters,
    volatility_score, constructiveness_score, understanding_score,
    ai_insights,
    talk_duration_minutes, talk_time_of_day, talk_day_of_week,
    analyzed_at, analysis_version, analysis_language
  ) VALUES (
    v_talk_id3, v_partnership_id, 'completed', NULL,
    25.0, 45.0, 30.0,
    20.0, 35.0,
    30.0, 25.0,
    0.3200, 38, 1650,
    7, 5, 5,
    '{
      "goodPoints": ["難しい話題でも話し合おうとする姿勢が見られます"],
      "concerns": ["感情的になる場面がありました", "一方的になりがちな部分がありました"],
      "suggestions": ["感情的になったら一度休憩を入れてみましょう", "相手の話を最後まで聞いてから返答してみましょう"],
      "comparisonWithPrevious": "前回より感情の起伏が大きくなっています",
      "overallComment": "話し合いを続けようとする姿勢は素晴らしいです"
    }'::jsonb,
    35, 'night', 3,
    NOW() - INTERVAL '21 days', 'v1', 'ja'
  );

  -- Sentiment 4: 28日前（普通）
  INSERT INTO talk_sentiments (
    talk_id, partnership_id, status, skip_reason,
    positive_ratio, neutral_ratio, negative_ratio,
    user1_positive_ratio, user1_negative_ratio,
    user2_positive_ratio, user2_negative_ratio,
    raw_volatility_stddev, sentence_count, total_characters,
    volatility_score, constructiveness_score, understanding_score,
    ai_insights,
    talk_duration_minutes, talk_time_of_day, talk_day_of_week,
    analyzed_at, analysis_version, analysis_language
  ) VALUES (
    v_talk_id4, v_partnership_id, 'completed', NULL,
    35.0, 55.0, 10.0,
    38.0, 8.0,
    32.0, 12.0,
    0.1500, 18, 720,
    4, 6, 6,
    '{
      "goodPoints": ["穏やかな会話ができています"],
      "concerns": [],
      "suggestions": ["もう少し深い話もしてみましょう"],
      "comparisonWithPrevious": "",
      "overallComment": "日常的な会話ができています"
    }'::jsonb,
    20, 'morning', 5,
    NOW() - INTERVAL '28 days', 'v1', 'ja'
  );

  -- Sentiment 5: 35日前（良好）
  INSERT INTO talk_sentiments (
    talk_id, partnership_id, status, skip_reason,
    positive_ratio, neutral_ratio, negative_ratio,
    user1_positive_ratio, user1_negative_ratio,
    user2_positive_ratio, user2_negative_ratio,
    raw_volatility_stddev, sentence_count, total_characters,
    volatility_score, constructiveness_score, understanding_score,
    ai_insights,
    talk_duration_minutes, talk_time_of_day, talk_day_of_week,
    analyzed_at, analysis_version, analysis_language
  ) VALUES (
    v_talk_id5, v_partnership_id, 'completed', NULL,
    48.0, 42.0, 10.0,
    50.0, 8.0,
    46.0, 12.0,
    0.1100, 55, 2400,
    3, 7, 8,
    '{
      "goodPoints": ["将来について前向きに話し合えました", "お互いの夢を共有できています", "相手の意見を尊重する姿勢が見られます"],
      "concerns": [],
      "suggestions": ["定期的にこういった話し合いの時間を設けるのも良いですね"],
      "comparisonWithPrevious": "",
      "overallComment": "深い対話ができました"
    }'::jsonb,
    50, 'evening', 0,
    NOW() - INTERVAL '35 days', 'v1', 'ja'
  );

  -- Sentiment 6: 42日前（データ不足）
  INSERT INTO talk_sentiments (
    talk_id, partnership_id, status, skip_reason,
    positive_ratio, neutral_ratio, negative_ratio,
    user1_positive_ratio, user1_negative_ratio,
    user2_positive_ratio, user2_negative_ratio,
    raw_volatility_stddev, sentence_count, total_characters,
    volatility_score, constructiveness_score, understanding_score,
    ai_insights,
    talk_duration_minutes, talk_time_of_day, talk_day_of_week,
    analyzed_at, analysis_version, analysis_language
  ) VALUES (
    v_talk_id6, v_partnership_id, 'insufficient_data', 'too_few_sentences',
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL,
    NULL, 5, 120,
    NULL, NULL, NULL,
    NULL,
    5, 'morning', 2,
    NOW() - INTERVAL '42 days', 'v1', 'ja'
  );

  -- Sentiment 7: 3日前（最新、改善傾向）
  INSERT INTO talk_sentiments (
    talk_id, partnership_id, status, skip_reason,
    positive_ratio, neutral_ratio, negative_ratio,
    user1_positive_ratio, user1_negative_ratio,
    user2_positive_ratio, user2_negative_ratio,
    raw_volatility_stddev, sentence_count, total_characters,
    volatility_score, constructiveness_score, understanding_score,
    ai_insights,
    talk_duration_minutes, talk_time_of_day, talk_day_of_week,
    analyzed_at, analysis_version, analysis_language
  ) VALUES (
    v_talk_id7, v_partnership_id, 'completed', NULL,
    50.0, 40.0, 10.0,
    52.0, 8.0,
    48.0, 12.0,
    0.0950, 32, 1400,
    2, 8, 8,
    '{
      "goodPoints": ["お互いをサポートしようという姿勢が見られます", "共感的な対話ができています"],
      "concerns": [],
      "suggestions": ["この調子で続けていきましょう"],
      "comparisonWithPrevious": "前回と比べて感情の安定度が向上しています",
      "overallComment": "お互いを思いやる良い話し合いでした"
    }'::jsonb,
    30, 'evening', 4,
    NOW() - INTERVAL '3 days', 'v1', 'ja'
  );

  RAISE NOTICE 'テストデータの作成が完了しました！';
  RAISE NOTICE 'Talk IDs: %, %, %, %, %, %, %', v_talk_id1, v_talk_id2, v_talk_id3, v_talk_id4, v_talk_id5, v_talk_id6, v_talk_id7;

END $$;

-- ============================================
-- 確認用クエリ
-- ============================================
-- SELECT * FROM talk_sentiments ORDER BY analyzed_at DESC;
-- SELECT * FROM talks WHERE summary_status = 'generated' ORDER BY started_at DESC;

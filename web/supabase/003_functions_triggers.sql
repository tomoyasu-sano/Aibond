-- ============================================================
-- Aibond Functions and Triggers
-- Version: 1.0
-- Created: 2025-11-29
-- ============================================================

-- ============================================================
-- 1. 新規ユーザー登録時の初期化トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  current_period TEXT;
BEGIN
  -- 現在の期間（YYYY-MM）
  current_period := to_char(NOW(), 'YYYY-MM');

  -- user_profiles 作成
  INSERT INTO public.user_profiles (id, name, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'ユーザー'),
    COALESCE(NEW.raw_user_meta_data->>'language', 'ja')
  );

  -- subscriptions 作成（Freeプランで初期化）
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  -- usage 作成（今月分）
  INSERT INTO public.usage (user_id, period, minutes_used, minutes_limit)
  VALUES (NEW.id, current_period, 0, 120); -- Free: 2時間 = 120分

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを適用
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_updated_at
  BEFORE UPDATE ON usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON partnerships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_talks_updated_at
  BEFORE UPDATE ON talks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promises_updated_at
  BEFORE UPDATE ON promises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_consultations_updated_at
  BEFORE UPDATE ON ai_consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_consultation_usage_updated_at
  BEFORE UPDATE ON ai_consultation_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. 招待コード生成関数
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. プラン上限取得関数
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_plan_minutes_limit(plan_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE plan_name
    WHEN 'free' THEN RETURN 120;      -- 2時間
    WHEN 'standard' THEN RETURN 900;  -- 15時間
    WHEN 'premium' THEN RETURN -1;    -- 無制限
    ELSE RETURN 120;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 5. 使用量チェック関数
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_start_talk(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
  v_minutes_used INTEGER;
  v_minutes_limit INTEGER;
BEGIN
  -- 現在のプランを取得
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- 上限を取得
  v_minutes_limit := get_plan_minutes_limit(v_plan);

  -- 無制限の場合
  IF v_minutes_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- 今月の使用量を取得
  SELECT COALESCE(minutes_used, 0) INTO v_minutes_used
  FROM usage
  WHERE user_id = p_user_id
  AND period = to_char(NOW(), 'YYYY-MM');

  -- 使用量が上限未満ならOK
  RETURN COALESCE(v_minutes_used, 0) < v_minutes_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

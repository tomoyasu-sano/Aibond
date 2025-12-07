-- ============================================================
-- Aibond Row Level Security (RLS) Policies
-- Version: 1.0
-- Created: 2025-11-29
-- ============================================================

-- ============================================================
-- 1. user_profiles - ユーザープロフィール
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- INSERT/DELETEはトリガー経由のみ（SECURITY DEFINER）

-- ============================================================
-- 2. subscriptions - サブスクリプション
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- INSERT/DELETEはトリガー/API経由のみ

-- ============================================================
-- 3. usage - 使用量
-- ============================================================
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON usage FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. partnerships - パートナー連携
-- ============================================================
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own partnerships"
  ON partnerships FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert partnerships they belong to"
  ON partnerships FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own partnerships"
  ON partnerships FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================================
-- 5. partner_invitations - パートナー招待
-- ============================================================
ALTER TABLE partner_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invitations"
  ON partner_invitations FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations"
  ON partner_invitations FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update own invitations"
  ON partner_invitations FOR UPDATE
  USING (auth.uid() = inviter_id);

-- 招待コードでの検索は別途API経由で行う

-- ============================================================
-- 6. talks - トーク
-- ============================================================
ALTER TABLE talks ENABLE ROW LEVEL SECURITY;

-- 閲覧ポリシー（アーカイブ対応）
CREATE POLICY "Users can view their own or active partnership's talks"
  ON talks FOR SELECT
  USING (
    (partnership_id IS NULL AND owner_user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = talks.partnership_id
      AND partnerships.status = 'active'
      AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

-- 作成ポリシー
CREATE POLICY "Users can create their own talks"
  ON talks FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- 更新ポリシー（アーカイブ対応）
CREATE POLICY "Users can update their own or active partnership's talks"
  ON talks FOR UPDATE
  USING (
    (partnership_id IS NULL AND owner_user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = talks.partnership_id
      AND partnerships.status = 'active'
      AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

-- 削除ポリシー（オーナーのみ）
CREATE POLICY "Users can delete their own talks"
  ON talks FOR DELETE
  USING (owner_user_id = auth.uid());

-- ============================================================
-- 7. talk_messages - トークメッセージ
-- ============================================================
ALTER TABLE talk_messages ENABLE ROW LEVEL SECURITY;

-- トークにアクセスできるユーザーのみメッセージを閲覧可能
CREATE POLICY "Users can view messages of accessible talks"
  ON talk_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM talks
      WHERE talks.id = talk_messages.talk_id
      AND (
        (talks.partnership_id IS NULL AND talks.owner_user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM partnerships
          WHERE partnerships.id = talks.partnership_id
          AND partnerships.status = 'active'
          AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can insert messages to own talks"
  ON talk_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM talks
      WHERE talks.id = talk_messages.talk_id
      AND talks.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. promises - 約束
-- ============================================================
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;

-- 閲覧ポリシー
CREATE POLICY "Users can view promises of active partnerships"
  ON promises FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = promises.partnership_id
      AND partnerships.status = 'active'
      AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

-- 作成ポリシー
CREATE POLICY "Users can create their own promises"
  ON promises FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- 更新ポリシー
CREATE POLICY "Users can update their own promises"
  ON promises FOR UPDATE
  USING (owner_user_id = auth.uid());

-- 削除ポリシー
CREATE POLICY "Users can delete their own promises"
  ON promises FOR DELETE
  USING (owner_user_id = auth.uid());

-- ============================================================
-- 9. ai_consultations - AI相談
-- ============================================================
ALTER TABLE ai_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consultations"
  ON ai_consultations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultations"
  ON ai_consultations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultations"
  ON ai_consultations FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 10. ai_consultation_usage - AI相談使用量
-- ============================================================
ALTER TABLE ai_consultation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consultation usage"
  ON ai_consultation_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultation usage"
  ON ai_consultation_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultation usage"
  ON ai_consultation_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 11. audio_files - 音声ファイル
-- ============================================================
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- トークにアクセスできるユーザーのみ音声ファイルを閲覧可能
CREATE POLICY "Users can view audio of accessible talks"
  ON audio_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM talks
      WHERE talks.id = audio_files.talk_id
      AND (
        (talks.partnership_id IS NULL AND talks.owner_user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM partnerships
          WHERE partnerships.id = talks.partnership_id
          AND partnerships.status = 'active'
          AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "Users can insert audio to own talks"
  ON audio_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM talks
      WHERE talks.id = audio_files.talk_id
      AND talks.owner_user_id = auth.uid()
    )
  );

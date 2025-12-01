# Manual Items Database Schema

## テーブル: manual_items

パートナーの「取扱説明書」項目を保存するテーブル

```sql
CREATE TABLE public.manual_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
  target_user_id UUID NOT NULL REFERENCES auth.users(id), -- 誰の取説か（自分 or パートナー）

  category TEXT NOT NULL, -- "basic", "personality", "hobbies", "communication", "lifestyle", "other"
  question TEXT NOT NULL, -- 質問内容
  answer TEXT NOT NULL DEFAULT '', -- 回答内容（空文字可）
  color TEXT, -- 本の色（ユーザーカスタマイズ）例: "#FFB6B9"
  is_fixed BOOLEAN DEFAULT FALSE, -- 固定質問かどうか（初期5つはtrue）

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT non_empty_question CHECK(length(question) > 0),
  CONSTRAINT valid_category CHECK(category IN ('basic', 'personality', 'hobbies', 'communication', 'lifestyle', 'other'))
);

-- インデックス
CREATE INDEX idx_manual_items_user ON manual_items(user_id);
CREATE INDEX idx_manual_items_target ON manual_items(target_user_id);
CREATE INDEX idx_manual_items_partnership ON manual_items(partnership_id);
CREATE INDEX idx_manual_items_category ON manual_items(category);

-- Row Level Security (RLS)
ALTER TABLE public.manual_items ENABLE ROW LEVEL SECURITY;

-- ポリシー: 自分が作成した項目は閲覧・編集可能
CREATE POLICY "Users can view their own manual items"
  ON public.manual_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own manual items"
  ON public.manual_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual items"
  ON public.manual_items
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual items"
  ON public.manual_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- パートナーの取説も閲覧可能（partnership_idで紐付いている場合）
CREATE POLICY "Users can view partner's manual items"
  ON public.manual_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = manual_items.partnership_id
      AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
      AND partnerships.status = 'active'
    )
  );
```

## 初期データ登録トリガー

新規ユーザー登録時に、自分の取説の固定質問5つを自動作成

```sql
-- 既存の handle_new_user() 関数に追加
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  current_period TEXT;
BEGIN
  -- 現在の期間（YYYY-MM）
  current_period := to_char(NOW(), 'YYYY-MM');

  -- user_profiles 作成
  INSERT INTO public.user_profiles (id, name, language)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'ユーザー'), 'ja');

  -- subscriptions 作成（Freeプランで初期化）
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  -- usage 作成（今月分）
  INSERT INTO public.usage (user_id, period, minutes_used, minutes_limit)
  VALUES (NEW.id, current_period, 0, 120); -- Free: 2時間 = 120分

  -- manual_items 作成（固定質問5つ - 自分の取説）
  INSERT INTO public.manual_items (user_id, target_user_id, category, question, answer, is_fixed)
  VALUES
    (NEW.id, NEW.id, 'basic', '好きな色', '', true),
    (NEW.id, NEW.id, 'basic', '好きな音楽・アーティスト', '', true),
    (NEW.id, NEW.id, 'basic', '嫌いな食べ物', '', true),
    (NEW.id, NEW.id, 'basic', '大切にしている価値観', '', true),
    (NEW.id, NEW.id, 'basic', '絶対に許せないこと', '', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## パートナー連携時の処理

パートナー連携時に、相手の取説の固定質問5つを自動作成

```sql
-- パートナー連携完了時に呼び出す関数
CREATE OR REPLACE FUNCTION public.initialize_partner_manual_items(
  p_user_id UUID,
  p_partner_id UUID,
  p_partnership_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- 相手の取説の固定質問5つを作成（回答は空）
  INSERT INTO public.manual_items (user_id, target_user_id, partnership_id, category, question, answer, is_fixed)
  VALUES
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '好きな色', '', true),
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '好きな音楽・アーティスト', '', true),
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '嫌いな食べ物', '', true),
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '大切にしている価値観', '', true),
    (p_user_id, p_partner_id, p_partnership_id, 'basic', '絶対に許せないこと', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## カテゴリ定義

| category | 日本語名 | アイコン | デフォルト色 |
|----------|---------|---------|-------------|
| basic | 基本情報 | 🎯 | #F5E6D3 |
| personality | 性格・気持ち | ❤️ | #FFB6B9 |
| hobbies | 趣味・好み | 🎨 | #A8D8EA |
| communication | コミュニケーション | 💬 | #C1E1C1 |
| lifestyle | 生活習慣 | 🏠 | #FFEFBA |
| other | その他 | 📝 | #E8E8E8 |

## データ例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-a-uuid",
  "partnership_id": "partnership-uuid",
  "target_user_id": "user-b-uuid",
  "category": "basic",
  "question": "好きな色",
  "answer": "青、緑",
  "color": "#A8D8EA",
  "is_fixed": true,
  "created_at": "2025-12-01T00:00:00Z",
  "updated_at": "2025-12-01T00:00:00Z"
}
```

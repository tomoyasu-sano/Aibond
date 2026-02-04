# Supabase ユーザー完全削除

ユーザーから削除依頼があった際に使用するSQL関数。

## SQL関数の作成

Supabase Dashboard → SQL Editor で以下を実行して関数を作成:

```sql
CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- talks テーブルの speaker 参照を NULL に
  UPDATE talks SET speaker1_user_id = NULL WHERE speaker1_user_id = target_user_id;
  UPDATE talks SET speaker2_user_id = NULL WHERE speaker2_user_id = target_user_id;

  -- talks テーブルの owner 参照がある場合は削除
  DELETE FROM talks WHERE owner_user_id = target_user_id;

  -- 関連テーブルを削除
  DELETE FROM subscriptions WHERE user_id = target_user_id;
  DELETE FROM kizuna_scores WHERE user_id = target_user_id;
  DELETE FROM kizuna_score_history WHERE user_id = target_user_id;
  DELETE FROM kizuna_advice WHERE user_id = target_user_id;
  DELETE FROM manual_items WHERE user_id = target_user_id;
  DELETE FROM ai_consultations WHERE user_id = target_user_id;
  DELETE FROM promises WHERE created_by_user_id = target_user_id;
  DELETE FROM usage WHERE user_id = target_user_id;
  DELETE FROM talk_sentiments WHERE user_id = target_user_id;
  DELETE FROM partnerships WHERE user1_id = target_user_id OR user2_id = target_user_id;
  DELETE FROM partner_invitations WHERE inviter_user_id = target_user_id OR invitee_user_id = target_user_id;
  DELETE FROM user_profiles WHERE id = target_user_id;

  -- 最後に auth.users から削除
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
```

## 使用方法

```sql
SELECT delete_user_completely('ユーザーID');
```

例:
```sql
SELECT delete_user_completely('d3ea32e1-c613-4ac8-92f1-8eea28d71275');
```

## 削除されるデータ

| テーブル | 削除内容 |
|---------|---------|
| auth.users | ユーザー認証情報 |
| user_profiles | プロフィール |
| subscriptions | サブスクリプション情報 |
| talks | 所有しているトーク（speaker参照はNULLに） |
| usage | 使用量データ |
| kizuna_* | 絆スコア関連 |
| manual_items | マニュアルアイテム |
| ai_consultations | AI相談履歴 |
| promises | 約束 |
| talk_sentiments | 感情分析結果 |
| partnerships | パートナーシップ |
| partner_invitations | 招待 |

## 削除されないデータ

- **GCS上の音声ファイル**: そのまま残る（監査目的で保持）
- **Stripe顧客データ**: 別途Stripeダッシュボードから削除が必要

## 注意事項

- 本番環境で実行する際は、対象ユーザーIDを必ず確認すること
- 削除は元に戻せない
- Stripeでサブスクリプションがアクティブな場合は、先にキャンセルすること

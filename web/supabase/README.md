# Aibond Supabase Setup

## 実行順序

以下の順序でSupabase SQL Editorで実行してください。

### 1. スキーマ作成
```sql
-- 001_schema.sql の内容をすべてコピー&実行
```

### 2. RLSポリシー作成
```sql
-- 002_rls.sql の内容をすべてコピー&実行
```

### 3. 関数・トリガー作成
```sql
-- 003_functions_triggers.sql の内容をすべてコピー&実行
```

## テーブル一覧

| テーブル名 | 説明 |
|-----------|------|
| user_profiles | ユーザープロフィール |
| subscriptions | サブスクリプション（個人単位） |
| usage | 使用量管理（個人単位） |
| partnerships | パートナー連携 |
| partner_invitations | パートナー招待 |
| talks | トーク（会話セッション） |
| talk_messages | トークメッセージ |
| promises | 約束リスト |
| ai_consultations | AI相談 |
| ai_consultation_usage | AI相談使用量 |
| audio_files | 音声ファイル |

## Storage バケット設定

Supabase Dashboard > Storage で以下のバケットを作成:

1. **audio-files** (Private)
   - 音声ファイル保存用
   - ポリシー: 認証ユーザーのみアップロード可能

## 注意事項

- `auth.users` テーブルはSupabase Authが管理するため、直接操作しない
- 新規ユーザー登録時、`handle_new_user` トリガーが自動的にプロフィール等を作成
- RLSが有効なため、認証なしではデータにアクセスできない

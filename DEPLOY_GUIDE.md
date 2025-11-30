# Aibond デプロイクイックガイド

ローカル開発後のデプロイ手順を簡潔にまとめたガイドです。

---

## 🎯 このガイドの対象

- ローカルで開発・テストが完了した
- 変更を本番環境（Cloud Run）にデプロイしたい
- デプロイの手順を素早く確認したい

**詳細な手順は**: [DEPLOYMENT.md](./DEPLOYMENT.md) を参照

---

## 📋 デプロイ前チェックリスト

### 1. ローカルでビルドが通るか確認

```bash
cd /Users/tomoyasu/dev/Aibond/web

# 依存関係の更新（package.json 変更時のみ）
npm install

# ビルドテスト
npm run build

# ビルド成果物の確認
ls -la .next/standalone
```

**エラーが出た場合**: ビルドエラーを修正してから次へ

---

### 2. 環境変数の確認

**ローカルの環境変数（`.env.local`）**:
```bash
# 必須の環境変数が設定されているか確認
cat web/.env.local | grep -E "SUPABASE|STRIPE|GEMINI"
```

**Secret Manager の確認**:
```bash
# Secret Managerに登録済みか確認
gcloud secrets list --project=aibond-479715
```

**環境変数を更新した場合**:
```bash
# Secret Managerを再設定
bash scripts/setup-secrets.sh
```

---

### 3. Gitコミット＆プッシュ

```bash
cd /Users/tomoyasu/dev/Aibond

# 変更の確認
git status

# 変更をステージング
git add .

# コミット（わかりやすいメッセージで）
git commit -m "feat: 新機能の説明"
# または
git commit -m "fix: バグ修正の説明"
# または
git commit -m "style: UI改善の説明"

# GitHubにプッシュ
git push origin master
```

**コミットメッセージのガイドライン**:
- `feat:` - 新機能
- `fix:` - バグ修正
- `style:` - UIやスタイルの変更
- `refactor:` - コードのリファクタリング
- `docs:` - ドキュメント更新
- `test:` - テスト追加
- `chore:` - その他の変更

---

## 🚀 デプロイ方法（2つの選択肢）

### 方法A: 自動デプロイ（推奨）

**GitHub Actionsが自動的にデプロイ**

1. **プッシュするだけ**:
   ```bash
   git push origin master
   ```

2. **GitHub Actionsの進捗確認**:
   - https://github.com/tomoyasu-sano/Aibond/actions を開く
   - 最新のワークフローをクリック
   - ビルド→デプロイの進捗を確認

3. **完了確認**:
   - ✅ すべてのステップが緑色になればOK
   - 🌐 Service URLが表示される

**メリット**:
- 手動作業不要
- ビルド・デプロイの自動化
- デプロイ履歴が残る

**デメリット**:
- 初回は設定が必要（Workload Identity連携）
- 現在は未設定のため、まず手動デプロイが必要

---

### 方法B: 手動デプロイ（現在はこちら）

**スクリプト1本でデプロイ**

```bash
cd /Users/tomoyasu/dev/Aibond

# デプロイスクリプトを実行
bash scripts/deploy.sh
```

**処理内容**:
1. Artifact Registryリポジトリの確認/作成
2. Dockerイメージのビルド（Cloud Build）
3. イメージをArtifact Registryにプッシュ
4. サービスアカウントの確認/作成
5. Cloud Runにデプロイ

**所要時間**: 約5〜10分

**完了後の出力**:
```
✅ Deployment completed successfully!

🌐 Service URL: https://aibond-web-694039525012.asia-northeast1.run.app
```

---

## ✅ デプロイ後の確認

### 1. ヘルスチェック

```bash
# APIの正常性確認
curl https://aibond-web-694039525012.asia-northeast1.run.app/api/health
```

**期待される出力**:
```json
{"status":"ok","timestamp":"2025-11-30T12:00:00.000Z","service":"aibond-web"}
```

---

### 2. アプリの動作確認

```bash
# ブラウザで開く
open https://aibond-web-694039525012.asia-northeast1.run.app
```

**確認項目**:
- [ ] ランディングページが表示される
- [ ] ログイン/新規登録が動作する
- [ ] ダッシュボードにアクセスできる
- [ ] 主要機能が動作する

---

### 3. ログの確認（エラーがある場合）

```bash
# Cloud Runのログを表示（最新20件）
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aibond-web" \
  --limit=20 \
  --project=aibond-479715 \
  --format=json

# またはシンプルに
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=aibond-web" \
  --project=aibond-479715
```

---

## 🔧 よくあるトラブルと対処法

### ビルドエラーが出る

**原因**: TypeScriptエラー、依存関係の問題

**対処法**:
```bash
# ローカルでビルドテスト
cd web
npm run build

# エラーを修正してから再デプロイ
```

---

### デプロイは成功したが、アプリが動かない

**原因**: 環境変数が正しく設定されていない

**対処法**:
```bash
# Secret Managerの確認
gcloud secrets list --project=aibond-479715

# 環境変数を再設定
bash scripts/setup-secrets.sh

# Cloud Runサービスを再起動
gcloud run services update aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715
```

---

### 認証（ログイン）が動かない

**原因**: Supabaseのリダイレクトurl設定が間違っている

**対処法**:
1. [Supabaseダッシュボード](https://supabase.com/dashboard) を開く
2. `Authentication` → `URL Configuration`
3. Redirect URLsに以下が含まれているか確認:
   ```
   https://aibond-web-694039525012.asia-northeast1.run.app/auth/callback
   ```

---

### Stripe Webhookが動かない

**原因**: Webhook URLが間違っている、またはシークレットが更新されていない

**対処法**:
1. [Stripeダッシュボード](https://dashboard.stripe.com) → `Developers` → `Webhooks`
2. エンドポイントURLを確認:
   ```
   https://aibond-web-694039525012.asia-northeast1.run.app/api/webhooks/stripe
   ```
3. Signing secretを確認し、Secret Managerを更新:
   ```bash
   echo -n "whsec_XXXXX" | gcloud secrets versions add stripe-webhook-secret \
     --data-file=- \
     --project=aibond-479715
   ```

---

## 📊 デプロイ後のモニタリング

### Cloud Runのメトリクス確認

```bash
# サービスの状態確認
gcloud run services describe aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715
```

**GCPコンソールで確認**:
- https://console.cloud.google.com/run?project=aibond-479715
- メトリクス、ログ、リビジョン履歴が表示される

---

## 🔄 ロールバック（前のバージョンに戻す）

デプロイ後に問題が発生した場合、前のバージョンに戻せます。

```bash
# リビジョン一覧を確認
gcloud run revisions list \
  --service=aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715

# 特定のリビジョンにトラフィックを切り替え
gcloud run services update-traffic aibond-web \
  --to-revisions=aibond-web-00001=100 \
  --region=asia-northeast1 \
  --project=aibond-479715
```

---

## 🎯 デプロイフローのまとめ

```
┌─────────────────────┐
│  ローカル開発完了    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  npm run build      │ ← ビルドテスト
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  git add .          │
│  git commit         │ ← コミット
│  git push           │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ↓           ↓
┌─────────┐  ┌─────────────┐
│  自動    │  │  手動        │
│デプロイ  │  │bash deploy.sh│
└────┬────┘  └──────┬──────┘
     │              │
     └─────┬────────┘
           │
           ↓
┌─────────────────────┐
│  Cloud Run デプロイ  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  ヘルスチェック      │
│  動作確認           │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  完了！             │
└─────────────────────┘
```

---

## 🚀 次のステップ

デプロイが完了したら:

1. **ユーザーテスト**
   - 実際のユーザーに使ってもらう
   - フィードバックを収集

2. **パフォーマンス確認**
   - レスポンス時間の測定
   - エラーレートの監視

3. **改善サイクル**
   - フィードバックをもとに機能改善
   - 次回のデプロイに向けて開発継続

---

## 📚 関連ドキュメント

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 詳細なデプロイ手順
- [TODO.md](./TODO.md) - やるべきことリスト
- [README.md](./web/README.md) - プロジェクト概要

---

**質問や問題があれば**: `TODO.md` の「不明点・質問リスト」に追加してください。

**Happy Deploying! 🎉**

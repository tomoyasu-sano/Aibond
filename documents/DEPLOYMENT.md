# Aibond デプロイ手順書

このドキュメントは、AibondをGoogle Cloud Runにデプロイする手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [初回セットアップ](#初回セットアップ)
3. [手動デプロイ](#手動デプロイ)
4. [自動デプロイ（CI/CD）](#自動デプロイcicd)
5. [デプロイ後の設定](#デプロイ後の設定)
6. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なツール

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (gcloud CLI)
- [Docker](https://www.docker.com/get-started)
- Git
- Node.js 20+

### 必要な情報

- GCPプロジェクトID: `aibond-479715`
- Supabaseプロジェクトの認証情報
- Stripe APIキー
- Gemini APIキー

---

## 初回セットアップ

### 1. GCP認証

```bash
# GCPにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project aibond-479715

# Application Default Credentials を設定
gcloud auth application-default login
gcloud auth application-default set-quota-project aibond-479715
```

### 2. 必要なAPIの有効化

すでに有効化済みですが、確認のため：

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  translate.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  speech.googleapis.com \
  aiplatform.googleapis.com
```

### 3. 環境変数の設定

`web/.env.local` ファイルに以下の環境変数を設定：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud
GEMINI_API_KEY=your-gemini-api-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-publishable-key
STRIPE_PRICE_STANDARD=price_xxx
STRIPE_PRICE_PREMIUM=price_xxx
```

### 4. Secret Managerに環境変数を登録

```bash
./scripts/setup-secrets.sh
```

このスクリプトは `.env.local` から環境変数を読み込み、Google Cloud Secret Managerに自動登録します。

---

## 手動デプロイ

### デプロイスクリプトの実行

```bash
./scripts/deploy.sh
```

このスクリプトは以下を自動実行します：

1. ✅ Artifact Registryリポジトリの作成
2. ✅ Dockerイメージのビルド＆プッシュ
3. ✅ サービスアカウントの作成と権限付与
4. ✅ Cloud Runへのデプロイ

### デプロイ完了後

デプロイが成功すると、以下のような出力が表示されます：

```
✅ Deployment completed successfully!

🌐 Service URL: https://aibond-web-xxxxxxxxxx-an.a.run.app
```

---

## 自動デプロイ（CI/CD）

GitHub Actionsを使用した自動デプロイを設定します。

### 1. Workload Identity連携の設定

GitHub ActionsからGCPにアクセスするため、Workload Identity連携を設定します。

#### サービスアカウントの作成

```bash
# GitHub Actions用サービスアカウント作成
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --project=aibond-479715

# 必要な権限を付与
gcloud projects add-iam-policy-binding aibond-479715 \
  --member="serviceAccount:github-actions-deployer@aibond-479715.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding aibond-479715 \
  --member="serviceAccount:github-actions-deployer@aibond-479715.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding aibond-479715 \
  --member="serviceAccount:github-actions-deployer@aibond-479715.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

#### Workload Identity Poolの作成

```bash
# Workload Identity Pool作成
gcloud iam workload-identity-pools create "github-actions" \
  --project="aibond-479715" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Workload Identity Provider作成
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="aibond-479715" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# サービスアカウントとの紐付け
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deployer@aibond-479715.iam.gserviceaccount.com \
  --project="aibond-479715" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/694039525012/locations/global/workloadIdentityPools/github-actions/attribute.repository/tomoyasu-sano/Aibond"
```

#### Workload Identity Provider IDの取得

```bash
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="aibond-479715" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --format="value(name)"
```

出力例：
```
projects/694039525012/locations/global/workloadIdentityPools/github-actions/providers/github-provider
```

### 2. GitHubリポジトリのSecretsを設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下を追加：

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: 上記で取得したProvider ID
- `GCP_SERVICE_ACCOUNT`: `github-actions-deployer@aibond-479715.iam.gserviceaccount.com`

### 3. 自動デプロイのトリガー

`main` または `master` ブランチに `web/` ディレクトリの変更をプッシュすると、自動的にデプロイが実行されます。

```bash
git add .
git commit -m "feat: update web application"
git push origin main
```

GitHub Actionsのワークフローは `.github/workflows/deploy-cloud-run.yml` で定義されています。

---

## デプロイ後の設定

### 1. Supabase認証リダイレクトURLの設定

Supabaseダッシュボード > Authentication > URL Configuration で以下を追加：

- Site URL: `https://your-service-url.run.app`
- Redirect URLs:
  - `https://your-service-url.run.app/auth/callback`
  - `http://localhost:3000/auth/callback` (開発用)

### 2. StripeのWebhook URLを更新

Stripeダッシュボード > Developers > Webhooks で以下のエンドポイントを追加：

- URL: `https://your-service-url.run.app/api/webhooks/stripe`
- イベント:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 3. カスタムドメインの設定（オプション）

```bash
gcloud run domain-mappings create \
  --service=aibond-web \
  --domain=your-custom-domain.com \
  --region=asia-northeast1 \
  --project=aibond-479715
```

---

## トラブルシューティング

### デプロイが失敗する

#### ビルドエラー

```bash
# ローカルでビルドテスト
cd web
npm install
npm run build
```

#### Secret Managerへのアクセスエラー

```bash
# サービスアカウントの権限を確認
gcloud projects get-iam-policy aibond-479715 \
  --flatten="bindings[].members" \
  --filter="bindings.members:aibond-cloud-run-sa@aibond-479715.iam.gserviceaccount.com"
```

### ヘルスチェックが失敗する

```bash
# ローカルでヘルスチェックAPIをテスト
cd web
npm run dev
curl http://localhost:3000/api/health
```

### ログの確認

```bash
# Cloud Runのログを確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=aibond-web" \
  --limit=50 \
  --project=aibond-479715 \
  --format=json
```

### サービスの再起動

```bash
# 新しいリビジョンをデプロイ（強制再起動）
gcloud run services update aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715
```

---

## 便利なコマンド

### サービス情報の確認

```bash
# サービスURLの取得
gcloud run services describe aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715 \
  --format="value(status.url)"

# 現在のリビジョン確認
gcloud run revisions list \
  --service=aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715

# メトリクスの確認
gcloud run services describe aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715 \
  --format="yaml(status)"
```

### 環境変数の更新

```bash
# 環境変数を追加/更新
gcloud run services update aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715 \
  --set-env-vars="NEW_VAR=value"

# Secretを更新
# 1. Secret Managerで新しいバージョンを追加
# 2. Cloud Runサービスを更新（自動的に最新バージョンを使用）
gcloud run services update aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715
```

---

## 参考リンク

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Next.js on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)

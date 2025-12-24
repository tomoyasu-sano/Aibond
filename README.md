# Aibond（アイボンド）

**言葉の壁を越えて、大切な人との絆を深める**

国際カップルのための会話記録・翻訳支援ツール

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=flat&logo=google-cloud&logoColor=white)](https://cloud.google.com/)

## 概要

Aibondは、国際カップル・夫婦（推定30万組）をターゲットとした会話記録・翻訳支援SaaSです。リアルタイム音声認識と翻訳により、言語の壁を超えたコミュニケーションを支援します。

### 主な特徴

- **リアルタイム文字起こし**: 2人の会話を即座にテキスト化
- **話者識別**: 誰が何を話したかを自動で識別
- **リアルタイム翻訳**: メイン言語からサブ言語へ即座に翻訳
- **AI自動整理**: 会話から「約束したこと」を自動抽出
- **会話履歴管理**: 大切な会話をカテゴリ別に整理・検索

## デモ

🔗 **本番環境**: https://aibond-web-694039525012.asia-northeast1.run.app

## 主な機能

### 1. 会話記録（Talks）
- リアルタイム音声認識による文字起こし
- 話者識別機能
- 多言語翻訳（Google Cloud Translation API）
- 会話履歴の保存と検索

### 2. AI分析
- Google Gemini APIを使用した会話の自動要約
- 「約束したこと」の自動抽出と管理
- 感情分析

### 3. パートナー管理
- カップル間のアカウント連携
- 共有会話履歴
- プライバシー設定

### 4. 多言語対応
- 日本語・英語のUI切り替え
- 音声認識対応言語の拡張

### 5. サブスクリプション
- Stripe統合による決済機能
- 3つの料金プラン（Free/Light/Standard/Premium）
- 使用時間の自動追跡

## 技術スタック

### フロントエンド
- **Next.js 15** - React フレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Radix UI** - アクセシブルなUIコンポーネント
- **shadcn/ui** - UIコンポーネントライブラリ

### バックエンド
- **Next.js API Routes** - サーバーサイドAPI
- **Supabase** - 認証・データベース（PostgreSQL）
- **Supabase Storage** - 音声ファイルストレージ

### AI・音声処理
- **Google Cloud Speech-to-Text** - 音声認識
- **Google Cloud Translation** - 翻訳
- **Google Gemini API** - AI分析・要約
- **Google Cloud Natural Language** - 感情分析

### 決済・課金
- **Stripe** - サブスクリプション管理
- **Stripe Webhooks** - イベント処理

### インフラ
- **Google Cloud Run** - コンテナホスティング
- **Google Cloud Secrets** - シークレット管理
- **Google Cloud Build** - CI/CD
- **Docker** - コンテナ化

## プロジェクト構成

```
Aibond/
├── web/                    # Next.jsアプリケーション
│   ├── src/
│   │   ├── app/           # App Router
│   │   ├── components/    # UIコンポーネント
│   │   ├── lib/           # ユーティリティ・ライブラリ
│   │   └── types/         # TypeScript型定義
│   ├── public/            # 静的ファイル
│   └── Dockerfile         # 本番環境用
├── scripts/               # デプロイスクリプト
├── SPECIFICATION/         # 仕様書
└── documents/            # ドキュメント
```

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- Supabaseアカウント
- Google Cloudアカウント
- Stripeアカウント

### ローカル開発環境の構築

1. **リポジトリのクローン**

```bash
git clone https://github.com/YOUR_USERNAME/Aibond.git
cd Aibond
```

2. **依存関係のインストール**

```bash
cd web
npm install
```

3. **環境変数の設定**

`web/.env.local`を作成し、以下の環境変数を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Cloud
GEMINI_API_KEY=your_gemini_api_key
AIBOND_GCP_CREDENTIALS_PATH=/path/to/service-account.json

# Stripe (テスト環境)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_LIGHT=price_...
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_PREMIUM=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=your@email.com
```

4. **データベースのセットアップ**

Supabaseダッシュボードで以下のマイグレーションを実行：

```bash
# web/supabase/migrations/ 内のSQLファイルを順番に実行
```

5. **開発サーバーの起動**

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## 開発

### ビルド

```bash
npm run build
```

### リンティング

```bash
npm run lint
```

### Stripe Webhookのテスト

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## デプロイ

### Google Cloud Runへのデプロイ

1. **Google Cloud認証**

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

2. **シークレットの設定**

```bash
# 必要なシークレットをGoogle Cloud Secretsに追加
gcloud secrets create stripe-secret-key --data-file=-
# ... その他のシークレット
```

3. **デプロイスクリプトの実行**

```bash
./deploy-production.sh
```

または手動デプロイ：

```bash
cd web
gcloud builds submit --config=../cloud-run.yaml
```

## 料金プラン

| プラン | 月額 | 利用時間 | 想定利用者 |
|--------|------|----------|-----------|
| Free | ¥0 | 1時間/月 | お試しユーザー |
| Light | ¥1,280 | 5時間/月 | ライトユーザー |
| Standard | ¥1,980 | 10時間/月 | 週1回の話し合い |
| Premium | ¥2,980 | 25時間/月 | ヘビーユーザー |

## ライセンス

このプロジェクトはプライベートプロジェクトです。

## 開発者

**Tomoyasu Sano**
- Email: anytimes.sano@gmail.com
- GitHub: [@YOUR_GITHUB_USERNAME]

## 謝辞

このプロジェクトは以下の技術・サービスを使用しています：
- Next.js
- Supabase
- Google Cloud Platform
- Stripe
- Vercel (shadcn/ui)

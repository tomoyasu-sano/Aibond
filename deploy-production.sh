#!/bin/bash

################################################################################
# Aibond 本番環境デプロイスクリプト
#
# 使い方:
#   bash deploy-production.sh
#
# 前提条件:
#   - Git で最新の変更がコミット・プッシュ済み
#   - gcloud CLI がインストール・認証済み
#   - 環境変数が Secret Manager に登録済み
################################################################################

set -e  # エラーが発生したら即座に終了

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクト設定
PROJECT_ID="aibond-479715"
REGION="asia-northeast1"
SERVICE_NAME="aibond-web"
IMAGE_NAME="asia-northeast1-docker.pkg.dev/$PROJECT_ID/aibond/web"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Aibond 本番環境デプロイ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# プロジェクトルートに移動
cd "$(dirname "$0")"

################################################################################
# ステップ1: 事前チェック
################################################################################
echo -e "${YELLOW}[1/7]${NC} 事前チェック中..."

# Git の状態確認
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}✗ エラー: コミットされていない変更があります${NC}"
    echo ""
    echo "以下のコマンドで変更をコミットしてください:"
    echo "  git add ."
    echo "  git commit -m 'feat: 変更内容の説明'"
    echo "  git push origin master"
    exit 1
fi

# リモートとの同期確認
git fetch origin master 2>/dev/null || true
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo -e "${YELLOW}⚠ 警告: ローカルとリモートが同期していません${NC}"
    echo ""
    read -p "続行しますか? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "デプロイをキャンセルしました"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} 事前チェック完了"
echo ""

################################################################################
# ステップ2: ローカルビルドテスト
################################################################################
echo -e "${YELLOW}[2/7]${NC} ローカルビルドテスト中..."

cd web
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} ローカルビルド成功"
else
    echo -e "${RED}✗ エラー: ローカルビルドに失敗しました${NC}"
    echo ""
    echo "以下のコマンドでエラー詳細を確認してください:"
    echo "  cd web"
    echo "  npm run build"
    exit 1
fi
cd ..
echo ""

################################################################################
# ステップ3: GCP プロジェクト設定確認
################################################################################
echo -e "${YELLOW}[3/7]${NC} GCP プロジェクト設定確認中..."

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠${NC} プロジェクトを $PROJECT_ID に切り替えます"
    gcloud config set project "$PROJECT_ID"
fi

echo -e "${GREEN}✓${NC} GCP プロジェクト: $PROJECT_ID"
echo ""

################################################################################
# ステップ4: Dockerイメージのビルド
################################################################################
echo -e "${YELLOW}[4/7]${NC} Dockerイメージをビルド中..."
echo ""

cd web

# Git SHA を取得
GIT_SHA=$(git rev-parse --short HEAD)

# Secret Manager から環境変数を取得（ビルド時に必要）
echo "Fetching build-time secrets..."
SUPABASE_URL=$(gcloud secrets versions access latest --secret="supabase-url" --project="$PROJECT_ID" 2>/dev/null || echo "")
SUPABASE_ANON_KEY=$(gcloud secrets versions access latest --secret="supabase-anon-key" --project="$PROJECT_ID" 2>/dev/null || echo "")

# Cloud Build でビルド（build argsを渡す）
if gcloud builds submit \
    --tag="$IMAGE_NAME:$GIT_SHA" \
    --project="$PROJECT_ID" \
    --timeout=20m \
    --substitutions="_NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL,_NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" \
    --config=- <<EOF
steps:
- name: 'gcr.io/cloud-builders/docker'
  args:
  - 'build'
  - '--build-arg=NEXT_PUBLIC_SUPABASE_URL=\$_NEXT_PUBLIC_SUPABASE_URL'
  - '--build-arg=NEXT_PUBLIC_SUPABASE_ANON_KEY=\$_NEXT_PUBLIC_SUPABASE_ANON_KEY'
  - '-t'
  - '$IMAGE_NAME:$GIT_SHA'
  - '.'
images:
- '$IMAGE_NAME:$GIT_SHA'
EOF
then
    echo ""
    echo -e "${GREEN}✓${NC} Dockerイメージのビルド完了: $GIT_SHA"
else
    echo ""
    echo -e "${RED}✗ エラー: Dockerイメージのビルドに失敗しました${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "手動デプロイ手順:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. ビルドログを確認:"
    echo "   https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
    echo ""
    echo "2. エラーを修正後、以下を実行:"
    echo "   cd web"
    echo "   gcloud builds submit --tag=$IMAGE_NAME:$GIT_SHA"
    echo ""
    echo "3. ビルド成功後、以下を実行:"
    echo "   bash deploy-production.sh"
    echo ""
    exit 1
fi

cd ..
echo ""

################################################################################
# ステップ5: latest タグの追加
################################################################################
echo -e "${YELLOW}[5/7]${NC} latest タグを追加中..."

if gcloud artifacts docker tags add \
    "$IMAGE_NAME:$GIT_SHA" \
    "$IMAGE_NAME:latest" \
    --project="$PROJECT_ID"; then
    echo -e "${GREEN}✓${NC} latest タグを追加しました"
else
    echo -e "${YELLOW}⚠${NC} タグの追加に失敗しましたが、続行します"
fi
echo ""

################################################################################
# ステップ6: Cloud Run にデプロイ
################################################################################
echo -e "${YELLOW}[6/7]${NC} Cloud Run にデプロイ中..."
echo ""

if gcloud run deploy "$SERVICE_NAME" \
    --image="$IMAGE_NAME:latest" \
    --platform=managed \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --allow-unauthenticated \
    --service-account="aibond-cloud-run-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --min-instances=1 \
    --max-instances=10 \
    --cpu=2 \
    --memory=2Gi \
    --timeout=300 \
    --concurrency=80 \
    --port=8080 \
    --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
    --set-secrets="NEXT_PUBLIC_SUPABASE_URL=supabase-url:latest,NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase-anon-key:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,GEMINI_API_KEY=gemini-api-key:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest,STRIPE_PRICE_STANDARD=stripe-price-standard:latest,STRIPE_PRICE_PREMIUM=stripe-price-premium:latest"; then
    echo ""
    echo -e "${GREEN}✓${NC} Cloud Run へのデプロイ完了"
else
    echo ""
    echo -e "${RED}✗ エラー: Cloud Run へのデプロイに失敗しました${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "手動デプロイ手順:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. デプロイログを確認:"
    echo "   https://console.cloud.google.com/run?project=$PROJECT_ID"
    echo ""
    echo "2. 環境変数が正しいか確認:"
    echo "   gcloud secrets list --project=$PROJECT_ID"
    echo ""
    echo "3. 環境変数を更新する場合:"
    echo "   bash scripts/setup-secrets.sh"
    echo ""
    echo "4. 手動でデプロイ:"
    echo "   gcloud run deploy $SERVICE_NAME \\"
    echo "     --image=$IMAGE_NAME:latest \\"
    echo "     --region=$REGION \\"
    echo "     --project=$PROJECT_ID"
    echo ""
    exit 1
fi
echo ""

################################################################################
# ステップ7: ヘルスチェック
################################################################################
echo -e "${YELLOW}[7/7]${NC} ヘルスチェック中..."

# サービスURLを取得
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --platform=managed \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)")

echo "サービスURL: $SERVICE_URL"
echo "ヘルスチェックを実行中..."
sleep 5  # サービスの起動を待つ

if curl -f -s "$SERVICE_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✓${NC} ヘルスチェック成功"
else
    echo -e "${YELLOW}⚠ 警告: ヘルスチェックに失敗しました${NC}"
    echo "サービスは起動していますが、正常に動作していない可能性があります"
    echo ""
    echo "ログを確認してください:"
    echo "  gcloud logging tail \"resource.type=cloud_run_revision\" --project=$PROJECT_ID"
fi
echo ""

################################################################################
# 完了
################################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ デプロイ完了！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🌐 サービスURL:${NC}"
echo "   $SERVICE_URL"
echo ""
echo -e "${GREEN}📝 デプロイ情報:${NC}"
echo "   Git SHA:     $GIT_SHA"
echo "   イメージ:    $IMAGE_NAME:latest"
echo "   リージョン:  $REGION"
echo ""
echo -e "${GREEN}🔍 次のステップ:${NC}"
echo "   1. ブラウザでアクセス:"
echo "      open $SERVICE_URL"
echo ""
echo "   2. ログを確認:"
echo "      gcloud logging tail \"resource.type=cloud_run_revision\" --project=$PROJECT_ID"
echo ""
echo "   3. Supabase / Stripe の設定を確認"
echo "      - Supabase Redirect URL"
echo "      - Stripe Webhook URL"
echo ""

################################################################################
# 手動デプロイ手順（エラー時の参考）
################################################################################
cat << 'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 エラー時の手動デプロイ手順
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

このスクリプトが途中でエラーになった場合、以下の手順で手動デプロイできます。

─────────────────────────────────────────────────────────
■ 手順1: ビルドエラーが発生した場合
─────────────────────────────────────────────────────────

1. ローカルでビルドテスト:
   cd web
   npm run build

2. エラーを修正してコミット:
   git add .
   git commit -m "fix: ビルドエラーを修正"
   git push origin master

3. 再度デプロイスクリプトを実行:
   bash deploy-production.sh

─────────────────────────────────────────────────────────
■ 手順2: Dockerビルドエラーが発生した場合
─────────────────────────────────────────────────────────

1. Cloud Build のログを確認:
   https://console.cloud.google.com/cloud-build/builds?project=aibond-479715

2. エラー内容を確認し、以下を修正:
   - Dockerfile の設定
   - package.json の依存関係
   - next.config.ts の設定

3. 修正後、手動でビルド:
   cd web
   gcloud builds submit --tag=asia-northeast1-docker.pkg.dev/aibond-479715/aibond/web:manual

4. ビルド成功後、デプロイ:
   gcloud run deploy aibond-web \
     --image=asia-northeast1-docker.pkg.dev/aibond-479715/aibond/web:manual \
     --region=asia-northeast1 \
     --project=aibond-479715

─────────────────────────────────────────────────────────
■ 手順3: デプロイエラーが発生した場合
─────────────────────────────────────────────────────────

1. 環境変数（Secret Manager）を確認:
   gcloud secrets list --project=aibond-479715

2. 環境変数が不足している場合、追加:
   echo -n "値" | gcloud secrets create 秘密の名前 \
     --data-file=- \
     --project=aibond-479715

3. または、一括再設定:
   bash scripts/setup-secrets.sh

4. サービスアカウントの権限を確認:
   gcloud projects get-iam-policy aibond-479715 \
     --flatten="bindings[].members" \
     --filter="bindings.members:aibond-cloud-run-sa"

5. 権限が不足している場合、追加:
   gcloud projects add-iam-policy-binding aibond-479715 \
     --member="serviceAccount:aibond-cloud-run-sa@aibond-479715.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"

─────────────────────────────────────────────────────────
■ 手順4: ヘルスチェックエラーが発生した場合
─────────────────────────────────────────────────────────

1. ログを確認:
   gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=aibond-web" \
     --project=aibond-479715

2. よくあるエラーと対処法:

   【エラー: Module not found】
   → Dockerfile の依存関係インストールを確認
   → package.json と package-lock.json を確認

   【エラー: Environment variable missing】
   → Secret Manager に環境変数が登録されているか確認
   → Cloud Run サービスの環境変数設定を確認

   【エラー: Database connection failed】
   → Supabase の認証情報を確認
   → Supabase プロジェクトが起動しているか確認

   【エラー: API key invalid】
   → Gemini API キーを確認
   → Google Cloud プロジェクトで API が有効化されているか確認

3. エラー修正後、サービスを再デプロイ:
   bash deploy-production.sh

─────────────────────────────────────────────────────────
■ 手順5: 完全手動デプロイ（最終手段）
─────────────────────────────────────────────────────────

スクリプトを使わず、完全に手動でデプロイする場合:

# 1. プロジェクト設定
gcloud config set project aibond-479715

# 2. Dockerイメージをビルド
cd web
docker build -t asia-northeast1-docker.pkg.dev/aibond-479715/aibond/web:manual .

# 3. Artifact Registry に認証
gcloud auth configure-docker asia-northeast1-docker.pkg.dev

# 4. イメージをプッシュ
docker push asia-northeast1-docker.pkg.dev/aibond-479715/aibond/web:manual

# 5. Cloud Run にデプロイ
gcloud run deploy aibond-web \
  --image=asia-northeast1-docker.pkg.dev/aibond-479715/aibond/web:manual \
  --platform=managed \
  --region=asia-northeast1 \
  --project=aibond-479715 \
  --allow-unauthenticated \
  --service-account=aibond-cloud-run-sa@aibond-479715.iam.gserviceaccount.com \
  --min-instances=1 \
  --max-instances=10 \
  --cpu=2 \
  --memory=2Gi \
  --timeout=300 \
  --concurrency=80 \
  --port=8080 \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
  --set-secrets="NEXT_PUBLIC_SUPABASE_URL=supabase-url:latest,NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase-anon-key:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,GEMINI_API_KEY=gemini-api-key:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest,STRIPE_PRICE_STANDARD=stripe-price-standard:latest,STRIPE_PRICE_PREMIUM=stripe-price-premium:latest"

# 6. デプロイ確認
SERVICE_URL=$(gcloud run services describe aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715 \
  --format="value(status.url)")

echo "サービスURL: $SERVICE_URL"
curl "$SERVICE_URL/api/health"

─────────────────────────────────────────────────────────
■ トラブルシューティング
─────────────────────────────────────────────────────────

【よくある問題1: Docker ビルドが遅い】
対処法:
- .dockerignore にnode_modules, .next が含まれているか確認
- Cloud Build のタイムアウトを延長: --timeout=30m

【よくある問題2: メモリ不足エラー】
対処法:
- Cloud Run のメモリを増やす: --memory=4Gi
- Next.js のビルド設定を最適化

【よくある問題3: Cold Start が遅い】
対処法:
- 最小インスタンスを増やす: --min-instances=2
- CPU Boost を有効化（既に設定済み）

【よくある問題4: 認証が動かない】
対処法:
- Supabase の Redirect URL を確認
- Cookie のドメイン設定を確認
- HTTPS が有効か確認

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 参考ドキュメント:
- DEPLOYMENT.md - 詳細なデプロイ手順
- DEPLOY_GUIDE.md - クイックガイド
- TODO.md - やるべきことリスト

🆘 サポート:
- Cloud Run ドキュメント: https://cloud.google.com/run/docs
- Next.js ドキュメント: https://nextjs.org/docs
- Supabase ドキュメント: https://supabase.com/docs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

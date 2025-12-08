#!/bin/bash

# Aibond Cloud Run Deployment Script
# 手動デプロイ用のスクリプト

set -e

PROJECT_ID="aibond-479715"
REGION="asia-northeast1"
SERVICE_NAME="aibond-web"
IMAGE_NAME="asia-northeast1-docker.pkg.dev/$PROJECT_ID/aibond/web"

echo "🚀 Deploying Aibond to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Check if we're in the correct directory
if [ ! -f "web/package.json" ]; then
  echo "❌ Error: Please run this script from the Aibond root directory"
  exit 1
fi

# Step 1: Create Artifact Registry repository if it doesn't exist
echo "📦 Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe aibond \
  --location="$REGION" \
  --project="$PROJECT_ID" &>/dev/null; then
  echo "✨ Creating Artifact Registry repository..."
  gcloud artifacts repositories create aibond \
    --repository-format=docker \
    --location="$REGION" \
    --description="Aibond Docker images" \
    --project="$PROJECT_ID"
else
  echo "✅ Repository already exists"
fi

# Step 2: Build and push Docker image
echo ""
echo "🏗️  Building Docker image..."
cd web
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project="$PROJECT_ID"
cd ..

# Step 3: Create service account if it doesn't exist
echo ""
echo "👤 Checking service account..."
SERVICE_ACCOUNT="aibond-cloud-run-sa@$PROJECT_ID.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT" \
  --project="$PROJECT_ID" &>/dev/null; then
  echo "✨ Creating service account..."
  gcloud iam service-accounts create aibond-cloud-run-sa \
    --display-name="Aibond Cloud Run Service Account" \
    --project="$PROJECT_ID"

  # Grant necessary permissions
  echo "🔑 Granting permissions..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/aiplatform.user"
else
  echo "✅ Service account already exists"
fi

# Step 4: Deploy to Cloud Run
echo ""
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE_NAME:latest" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --allow-unauthenticated \
  --service-account="$SERVICE_ACCOUNT" \
  --min-instances=1 \
  --max-instances=10 \
  --cpu=2 \
  --memory=2Gi \
  --timeout=300 \
  --concurrency=80 \
  --port=8080 \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1" \
  --set-secrets="NEXT_PUBLIC_SUPABASE_URL=supabase-url:latest,\
NEXT_PUBLIC_SUPABASE_ANON_KEY=supabase-anon-key:latest,\
SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,\
GEMINI_API_KEY=gemini-api-key:latest,\
STRIPE_SECRET_KEY=stripe-secret-key:latest,\
STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,\
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=stripe-publishable-key:latest,\
STRIPE_PRICE_STANDARD=stripe-price-standard:latest,\
STRIPE_PRICE_PREMIUM=stripe-price-premium:latest"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Test the health check: curl $SERVICE_URL/api/health"
echo "2. Update Stripe webhook URL to: $SERVICE_URL/api/webhooks/stripe"
echo "3. Update Supabase redirect URLs in dashboard"

#!/bin/bash

# Aibond Secret Manager Setup Script
# このスクリプトは .env.local から環境変数を読み込み、Google Cloud Secret Manager に登録します

set -e

PROJECT_ID="aibond-479715"
ENV_FILE="web/.env.local"

echo "🔐 Setting up secrets in Google Cloud Secret Manager..."
echo "Project: $PROJECT_ID"
echo ""

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE not found"
  echo "Please create .env.local file with required environment variables"
  exit 1
fi

# Function to create or update secret
create_or_update_secret() {
  local secret_name=$1
  local secret_value=$2

  if [ -z "$secret_value" ]; then
    echo "⏭️  Skipping $secret_name (empty value)"
    return
  fi

  # Check if secret exists
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
    echo "📝 Updating existing secret: $secret_name"
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
      --data-file=- \
      --project="$PROJECT_ID"
  else
    echo "✨ Creating new secret: $secret_name"
    echo -n "$secret_value" | gcloud secrets create "$secret_name" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="$PROJECT_ID"
  fi
}

# Load environment variables
source "$ENV_FILE"

# Supabase
echo "📦 Supabase secrets..."
create_or_update_secret "supabase-url" "$NEXT_PUBLIC_SUPABASE_URL"
create_or_update_secret "supabase-anon-key" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
create_or_update_secret "supabase-service-role-key" "$SUPABASE_SERVICE_ROLE_KEY"

# Google Cloud APIs
echo ""
echo "🤖 Google Cloud API secrets..."
create_or_update_secret "gemini-api-key" "$GEMINI_API_KEY"

# Stripe
echo ""
echo "💳 Stripe secrets..."
create_or_update_secret "stripe-secret-key" "$STRIPE_SECRET_KEY"
create_or_update_secret "stripe-webhook-secret" "$STRIPE_WEBHOOK_SECRET"
create_or_update_secret "stripe-publishable-key" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
create_or_update_secret "stripe-price-standard" "$STRIPE_PRICE_STANDARD"
create_or_update_secret "stripe-price-premium" "$STRIPE_PRICE_PREMIUM"

echo ""
echo "✅ All secrets have been created/updated successfully!"
echo ""
echo "Next steps:"
echo "1. Grant Cloud Run service account access to secrets"
echo "2. Deploy to Cloud Run using: ./scripts/deploy.sh"

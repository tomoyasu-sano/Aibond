# カスタムドメイン設定チェックリスト

独自ドメインを取得した後に行う設定手順をまとめています。

**最終更新**: 2025年11月30日

---

## 📋 前提条件

- [ ] 独自ドメインを取得済み（例: `aibond.com`）
- [ ] ドメインのDNS設定にアクセスできる
- [ ] Cloud Runにアプリがデプロイ済み
- [ ] gcloud CLI がインストール・認証済み

---

## 🎯 設定の全体フロー

```
ドメイン取得
    ↓
Cloud Run にカスタムドメインを追加
    ↓
DNS レコードを設定
    ↓
SSL証明書が自動発行される（数分〜1時間）
    ↓
Supabase / Stripe の URL を更新
    ↓
動作確認
    ↓
完了！
```

---

## ステップ1: Cloud Run にカスタムドメインを追加

### 1-1. ドメインの所有権を確認

Cloud Runにドメインを追加する前に、ドメインの所有権を確認します。

```bash
# Google Cloud Console でドメインの所有権を確認
# https://console.cloud.google.com/run/domains?project=aibond-479715
```

または、gcloud コマンドで確認:

```bash
gcloud domains verify aibond.com
```

**手順**:
1. 上記URLにアクセス
2. `Add mapping` をクリック
3. ドメインを入力
4. 所有権確認の指示に従う（TXTレコードをDNSに追加）

---

### 1-2. Cloud Run サービスにドメインをマッピング

**コマンド**:
```bash
gcloud run domain-mappings create \
  --service=aibond-web \
  --domain=aibond.com \
  --region=asia-northeast1 \
  --project=aibond-479715
```

**www サブドメインも追加する場合**:
```bash
gcloud run domain-mappings create \
  --service=aibond-web \
  --domain=www.aibond.com \
  --region=asia-northeast1 \
  --project=aibond-479715
```

**実行後の出力例**:
```
Mapping [aibond.com] to [aibond-web]...
✓ Creating domain mapping...
✓ Waiting for Certificate to be issued...

To complete the process, please add the following DNS records to your domain provider:

NAME                TYPE     DATA
aibond.com          A        216.239.32.21
aibond.com          A        216.239.34.21
aibond.com          A        216.239.36.21
aibond.com          A        216.239.38.21
aibond.com          AAAA     2001:4860:4802:32::15
aibond.com          AAAA     2001:4860:4802:34::15
aibond.com          AAAA     2001:4860:4802:36::15
aibond.com          AAAA     2001:4860:4802:38::15
```

**重要**: 上記の IP アドレスをメモしてください（次のステップで使用）

---

## ステップ2: DNS レコードを設定

### 2-1. DNS設定画面にアクセス

ドメインレジストラ（ドメイン購入先）の管理画面にログイン。

**主要なドメインレジストラ**:
- **お名前.com**: https://www.onamae.com/
- **ムームードメイン**: https://muumuu-domain.com/
- **Google Domains**: https://domains.google/
- **Cloudflare**: https://www.cloudflare.com/
- **AWS Route 53**: https://console.aws.amazon.com/route53/

---

### 2-2. Aレコードを追加

**設定内容**:

| ホスト名 | タイプ | 値（IPアドレス） | TTL |
|---------|-------|----------------|-----|
| @ または 空欄 | A | 216.239.32.21 | 3600 |
| @ または 空欄 | A | 216.239.34.21 | 3600 |
| @ または 空欄 | A | 216.239.36.21 | 3600 |
| @ または 空欄 | A | 216.239.38.21 | 3600 |

**注意**:
- `@` は ルートドメイン（`aibond.com`）を指します
- レジストラによっては「空欄」や「*」で指定する場合があります
- **上記のIPアドレスは例です。必ず `gcloud` コマンドの出力を使用してください**

---

### 2-3. AAAAレコードを追加（IPv6対応）

| ホスト名 | タイプ | 値（IPv6アドレス） | TTL |
|---------|-------|------------------|-----|
| @ または 空欄 | AAAA | 2001:4860:4802:32::15 | 3600 |
| @ または 空欄 | AAAA | 2001:4860:4802:34::15 | 3600 |
| @ または 空欄 | AAAA | 2001:4860:4802:36::15 | 3600 |
| @ または 空欄 | AAAA | 2001:4860:4802:38::15 | 3600 |

**注意**: こちらも `gcloud` コマンドの出力を使用してください

---

### 2-4. wwwサブドメインの設定（オプション）

**方法A: CNAMEレコード（推奨）**

| ホスト名 | タイプ | 値 | TTL |
|---------|-------|---|-----|
| www | CNAME | aibond.com | 3600 |

**方法B: Aレコード**

| ホスト名 | タイプ | 値（IPアドレス） | TTL |
|---------|-------|----------------|-----|
| www | A | 216.239.32.21 | 3600 |
| www | A | 216.239.34.21 | 3600 |
| www | A | 216.239.36.21 | 3600 |
| www | A | 216.239.38.21 | 3600 |

---

### 2-5. DNS設定の反映を待つ

**反映時間**: 数分〜48時間（通常は1〜2時間）

**確認コマンド**:
```bash
# Aレコードの確認
dig aibond.com A

# AAAAレコードの確認
dig aibond.com AAAA

# wwwサブドメインの確認
dig www.aibond.com
```

**期待される出力**:
```
;; ANSWER SECTION:
aibond.com.    3600    IN    A    216.239.32.21
aibond.com.    3600    IN    A    216.239.34.21
...
```

---

## ステップ3: SSL証明書の発行を確認

Cloud Runは自動的にSSL証明書（Let's Encrypt）を発行します。

**確認コマンド**:
```bash
gcloud run domain-mappings describe \
  --domain=aibond.com \
  --region=asia-northeast1 \
  --project=aibond-479715
```

**期待される出力**:
```yaml
status:
  conditions:
  - type: Ready
    status: "True"
  - type: CertificateProvisioned
    status: "True"
```

**`CertificateProvisioned: True`** になっていればSSL証明書が発行されています。

**発行されない場合**:
- DNSレコードが正しく設定されているか確認
- DNS反映を待つ（最大48時間）
- ドメインの所有権確認が完了しているか確認

---

## ステップ4: ブラウザで動作確認

```bash
# HTTPSでアクセス
open https://aibond.com

# wwwサブドメイン
open https://www.aibond.com
```

**確認項目**:
- [ ] HTTPSでアクセスできる（鍵マークが表示される）
- [ ] ページが正常に表示される
- [ ] ログイン/新規登録が動作する
- [ ] APIが正常に動作する

---

## ステップ5: Supabase の URL を更新

### 5-1. Supabase ダッシュボードにアクセス

```
https://supabase.com/dashboard
```

### 5-2. Authentication 設定を更新

**左サイドバー** → `Authentication` → `URL Configuration`

**Site URL**:
```
https://aibond.com
```

**Redirect URLs**（既存に追加）:
```
https://aibond.com/auth/callback
https://www.aibond.com/auth/callback
https://aibond-web-694039525012.asia-northeast1.run.app/auth/callback  ← 残す
http://localhost:3000/auth/callback  ← 残す（開発用）
```

**保存**: `Save` ボタンをクリック

---

## ステップ6: Stripe の Webhook URL を更新

### 6-1. Stripe ダッシュボードにアクセス

```
https://dashboard.stripe.com
```

### 6-2. Webhook エンドポイントを更新

**左サイドバー** → `Developers` → `Webhooks`

**既存のエンドポイントを削除** または **URLを更新**:

**新しいエンドポイント URL**:
```
https://aibond.com/api/webhooks/stripe
```

**イベント**（変更なし）:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Signing secret を確認**:
- 新しい Webhook を作成した場合、新しい `whsec_XXX` が発行される
- Secret Manager を更新する必要がある

```bash
# Webhook Secretを更新
echo -n "whsec_新しいシークレット" | gcloud secrets versions add stripe-webhook-secret \
  --data-file=- \
  --project=aibond-479715

# Cloud Runサービスを再起動（環境変数を再読み込み）
gcloud run services update aibond-web \
  --region=asia-northeast1 \
  --project=aibond-479715
```

---

## ステップ7: その他のサービス・設定を更新

### 7-1. Google Cloud プロジェクトの認証情報

**OAuth 2.0 クライアント ID の承認済みリダイレクト URI**:

```
https://console.cloud.google.com/apis/credentials?project=aibond-479715
```

**追加**:
```
https://aibond.com/auth/callback
https://www.aibond.com/auth/callback
```

---

### 7-2. ソーシャルログイン（Google OAuth）

Supabaseを通じて設定している場合、Supabase側の設定で完了します。

個別に設定している場合:
1. Google Cloud Console → `認証情報`
2. OAuth 2.0 クライアント ID を選択
3. `承認済みのリダイレクト URI` に以下を追加:
   ```
   https://aibond.com/auth/callback
   ```

---

### 7-3. CORS設定（必要に応じて）

Next.jsアプリケーションで追加のCORS設定が必要な場合:

**`next.config.ts`** に追加:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://aibond.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## ステップ8: リダイレクト設定（オプション）

### 8-1. wwwあり/なしの統一

**方針を決める**:
- `aibond.com` → `www.aibond.com` にリダイレクト
- `www.aibond.com` → `aibond.com` にリダイレクト

**推奨**: `www.aibond.com` → `aibond.com`（wwwなしに統一）

**Next.js の middleware で設定**:

**`src/middleware.ts`** に追加:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host');

  // www → non-www リダイレクト
  if (hostname?.startsWith('www.')) {
    const newHostname = hostname.replace('www.', '');
    return NextResponse.redirect(`https://${newHostname}${request.nextUrl.pathname}`, 301);
  }

  // その他の処理...
  return NextResponse.next();
}
```

---

### 8-2. HTTP → HTTPS リダイレクト

Cloud Run は自動的に HTTP → HTTPS リダイレクトを行うため、**設定不要**です。

---

## ステップ9: 環境変数の更新（必要に応じて）

カスタムドメインに関連する環境変数がある場合、更新します。

**例**:
```bash
# NEXT_PUBLIC_APP_URL などを設定している場合
echo -n "https://aibond.com" | gcloud secrets versions add app-url \
  --data-file=- \
  --project=aibond-479715
```

---

## ステップ10: 最終動作確認

### 10-1. 全機能のテスト

- [ ] **ランディングページ**: https://aibond.com
- [ ] **ログイン**: https://aibond.com/login
- [ ] **新規登録**: https://aibond.com/signup
- [ ] **Google OAuth**: ログイン → Googleで続ける
- [ ] **ダッシュボード**: ログイン後にアクセス
- [ ] **トーク機能**: 会話記録が動作する
- [ ] **AI相談**: チャットが動作する
- [ ] **Stripe決済**: プラン選択 → チェックアウト
- [ ] **Webhook**: Stripeイベントが正しく受信される

---

### 10-2. パフォーマンステスト

```bash
# ページ速度テスト
# https://pagespeed.web.dev/

# SSL証明書の確認
# https://www.ssllabs.com/ssltest/analyze.html?d=aibond.com
```

---

### 10-3. SEO設定（オプション）

**robots.txt** を設置:

**`web/public/robots.txt`**:
```
User-agent: *
Allow: /
Sitemap: https://aibond.com/sitemap.xml
```

**sitemap.xml** を生成（Next.js 14+）:

**`web/app/sitemap.ts`**:
```typescript
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://aibond.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://aibond.com/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // 他のページを追加...
  ];
}
```

---

## 🔧 トラブルシューティング

### 問題1: SSL証明書が発行されない

**原因**:
- DNSレコードが正しく設定されていない
- DNS反映が完了していない

**対処法**:
```bash
# DNSレコードを確認
dig aibond.com A

# Cloud Runのドメインマッピングを確認
gcloud run domain-mappings describe \
  --domain=aibond.com \
  --region=asia-northeast1 \
  --project=aibond-479715

# 証明書の状態を確認
# status.conditions で CertificateProvisioned を確認
```

---

### 問題2: ドメインにアクセスできない

**原因**:
- DNSレコードの設定ミス
- DNS反映が完了していない

**対処法**:
```bash
# DNS反映状況を確認
dig aibond.com

# Cloud RunのIPアドレスを再確認
gcloud run domain-mappings describe \
  --domain=aibond.com \
  --region=asia-northeast1 \
  --project=aibond-479715
```

---

### 問題3: 認証（ログイン）が動かない

**原因**:
- Supabaseのリダイレクト URL が更新されていない

**対処法**:
1. Supabaseダッシュボード → `Authentication` → `URL Configuration`
2. `Redirect URLs` に `https://aibond.com/auth/callback` が含まれているか確認
3. `Save` をクリック
4. ブラウザのキャッシュをクリア

---

### 問題4: Stripe Webhookが動かない

**原因**:
- Webhook URLが更新されていない
- Webhook Secretが古い

**対処法**:
1. Stripeダッシュボード → `Developers` → `Webhooks`
2. エンドポイント URL を確認: `https://aibond.com/api/webhooks/stripe`
3. 新しいエンドポイントを作成した場合、Signing secretを更新:
   ```bash
   echo -n "whsec_XXX" | gcloud secrets versions add stripe-webhook-secret \
     --data-file=- \
     --project=aibond-479715
   ```
4. Cloud Runサービスを再起動

---

## 📋 完了チェックリスト

### Cloud Run設定
- [ ] ドメインの所有権確認完了
- [ ] Cloud Runにドメインマッピング追加
- [ ] SSL証明書が発行された

### DNS設定
- [ ] Aレコードを追加（4つ）
- [ ] AAAAレコードを追加（4つ、IPv6対応の場合）
- [ ] wwwサブドメインの設定（CNAMEまたはA）
- [ ] DNS反映を確認（`dig` コマンド）

### 外部サービス更新
- [ ] Supabase Site URL 更新
- [ ] Supabase Redirect URLs 更新
- [ ] Stripe Webhook URL 更新
- [ ] Stripe Webhook Secret 更新（必要に応じて）
- [ ] Google OAuth リダイレクト URI 更新（必要に応じて）

### 動作確認
- [ ] HTTPSでアクセスできる
- [ ] ログイン/新規登録が動作する
- [ ] Google OAuth が動作する
- [ ] トーク機能が動作する
- [ ] AI相談が動作する
- [ ] Stripe決済が動作する
- [ ] Webhookが正常に受信される

### その他
- [ ] wwwリダイレクト設定（オプション）
- [ ] robots.txt 設置（オプション）
- [ ] sitemap.xml 生成（オプション）

---

## 📚 参考リンク

- [Cloud Run カスタムドメイン公式ドキュメント](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Supabase 認証設定](https://supabase.com/docs/guides/auth)
- [Stripe Webhook](https://stripe.com/docs/webhooks)
- [DNS レコードの基礎](https://www.cloudflare.com/learning/dns/dns-records/)

---

## 🆘 サポート

問題が解決しない場合:
1. `TODO.md` の「不明点・質問リスト」に追加
2. Cloud Run ログを確認: `gcloud logging tail`
3. GCP サポートに問い合わせ

---

**カスタムドメイン設定完了！おめでとうございます！** 🎉

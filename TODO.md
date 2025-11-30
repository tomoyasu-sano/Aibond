# Aibond やるべきことリスト

最終更新: 2025年11月30日

---

## 🎯 現在の状況

- ✅ GitHub連携完了（プライベートリポジトリ）
- ✅ Cloud Run初回デプロイ完了
- ✅ Secret Manager設定完了
- ✅ CI/CD（GitHub Actions）設定完了
- ⚠️ Supabase設定：一部完了（CORS設定はスキップ可）
- ⚠️ Stripe設定：本番申請待ち（Test modeは設定済み）

---

## 📝 すぐにやるべきこと（優先度: 高）

### 1. Supabase認証設定の完了

**Status**: 🟡 進行中

**手順**:
1. [Supabaseダッシュボード](https://supabase.com/dashboard) を開く
2. Aibondプロジェクトを選択
3. 左サイドバー → `Authentication` → `URL Configuration`
4. 以下を設定：

   ```
   Site URL:
   https://aibond-web-694039525012.asia-northeast1.run.app

   Redirect URLs (既存に追加):
   https://aibond-web-694039525012.asia-northeast1.run.app/auth/callback
   http://localhost:3000/auth/callback
   ```

5. `Save` をクリック

**確認方法**:
```bash
# デプロイされたアプリでログインを試す
open https://aibond-web-694039525012.asia-northeast1.run.app/login
```

**CORS設定について**: 不要（自動設定されます）

---

### 2. Stripe本番環境申請

**Status**: ⏸️ 保留中（あなたが対応）

**必要な作業**:
- [ ] Stripeビジネス情報の登録
- [ ] 本人確認書類の提出
- [ ] 銀行口座情報の登録
- [ ] 本番環境の有効化

**参考リンク**:
- [Stripe本番環境の有効化ガイド](https://stripe.com/docs/account/activate)

**現状**: Test mode で開発・テスト可能

---

## 🔧 ローカル開発再開の準備

### 3. ローカル開発環境の確認

**Status**: ✅ 準備完了

**確認コマンド**:
```bash
cd /Users/tomoyasu/dev/Aibond/web

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ブラウザで開く
open http://localhost:3000
```

**環境変数**: `web/.env.local` が正しく設定されているか確認

---

## 🚀 次回のデプロイ準備

### 4. デプロイ前チェックリスト

**Status**: 📋 準備中

- [ ] ローカルでビルドが通ることを確認
- [ ] コミット＆プッシュ
- [ ] 自動デプロイ（GitHub Actions）または手動デプロイ

**詳細手順**: `DEPLOY_GUIDE.md` を参照

---

## 🎨 アプリ改善タスク（開発中）

### UI/UX改善

- [ ] ランディングページのデザイン調整
- [ ] ダッシュボードのレイアウト改善
- [ ] レスポンシブ対応の確認
- [ ] 多言語UI対応（日本語・英語）

### 機能追加

- [ ] プッシュ通知機能
- [ ] 音声品質の向上（ノイズキャンセリング）
- [ ] 話者識別精度の改善
- [ ] プロフィール画像アップロード

### テスト・品質改善

- [ ] E2Eテストの追加（Playwright）
- [ ] ユニットテストの追加（Vitest）
- [ ] エラーログ監視（Sentry導入）
- [ ] パフォーマンス計測（Vercel Analytics）

---

## 📚 将来的なタスク（優先度: 中）

### インフラ・運用

- [ ] カスタムドメインの取得と設定
- [ ] CDN設定（画像配信最適化）
- [ ] データベースバックアップ戦略
- [ ] モニタリング・アラート設定

### セキュリティ

- [ ] セキュリティ監査
- [ ] 脆弱性スキャン（Dependabot有効化）
- [ ] GDPR対応の検討

### モバイルアプリ

- [ ] React Native実装（native/ディレクトリ）
- [ ] App Store / Google Play申請準備

---

## ❓ 不明点・質問リスト

### 技術的な質問

- [ ] 話者識別の精度が低い場合の対応方針
- [ ] 音声データの長期保存戦略（コスト vs 価値）
- [ ] ユーザー数増加時のスケーリング計画

### ビジネス的な質問

- [ ] 価格設定の妥当性検証
- [ ] ターゲットユーザーのフィードバック収集
- [ ] マーケティング戦略

---

## 📖 参考ドキュメント

- [DEPLOYMENT.md](./DEPLOYMENT.md) - デプロイ全般の詳細手順
- [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) - ローカル開発→デプロイのクイックガイド
- [MVP_SPECIFICATION.md](./SPECIFICATION/MVP_SPECIFICATION.md) - MVP仕様書
- [TECHNICAL_SPECIFICATION.md](./SPECIFICATION/TECHNICAL_SPECIFICATION.md) - 技術仕様書

---

## 🎯 今週の目標

**Week 1 (今週)**:
- [x] GitHub連携
- [x] Cloud Runデプロイ
- [ ] Supabase設定完了
- [ ] ローカル開発環境でのUI改善

**Week 2 (来週)**:
- [ ] Stripe本番環境申請
- [ ] テストユーザーでの動作確認
- [ ] バグ修正
- [ ] パフォーマンス改善

**Week 3-4**:
- [ ] β版リリース
- [ ] フィードバック収集
- [ ] 機能追加・改善

---

## 💡 メモ・アイデア

### 新機能アイデア
- 会話のエクスポート機能（PDF、テキスト）
- カップル向けのゲーミフィケーション要素
- 記念日リマインダー

### 技術的改善アイデア
- WebSocketによるリアルタイム同期（現在はSSE）
- エッジキャッシング（Cloudflare等）
- オフライン対応（PWA）

---

**次のアクション**: ローカル開発を再開し、UI改善を進める 🚀

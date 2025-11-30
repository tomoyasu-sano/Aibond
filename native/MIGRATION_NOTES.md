# Aibond ネイティブ化メモ

Web版開発中に気づいた、ネイティブ移行時の注意点を記録します。

---

## 1. 音声処理

### Web版
- Web Audio API + MediaRecorder
- `navigator.mediaDevices.getUserMedia()`
- Opus形式で録音

### Native版で必要な変更
- `expo-av` または `react-native-audio-api`
- バックグラウンド録音対応
- 音声フォーマットの違い（iOS: AAC, Android: Opus/AAC）

### 対応方針
```typescript
// lib/audio/recorder.ts を抽象化
interface AudioRecorder {
  start(): Promise<void>;
  stop(): Promise<Blob | string>; // Web: Blob, Native: file path
  pause(): void;
  resume(): void;
}
```

### 参考ライブラリ
- [expo-av](https://docs.expo.dev/versions/latest/sdk/av/)
- [react-native-audio-recorder-player](https://github.com/hyochan/react-native-audio-recorder-player)

---

## 2. 認証

### Web版
- Supabase Auth（ブラウザセッション）
- Cookieベースのセッション管理

### Native版で必要な変更
- トークンをSecureStoreに保存
- ディープリンクでOAuth callback処理

### 対応方針
```typescript
// lib/auth/storage.ts を抽象化
interface AuthStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  removeToken(): Promise<void>;
}
```

### 参考
- [Supabase Expo チュートリアル](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

---

## 3. ストレージ

### Web版
- localStorage
- sessionStorage

### Native版で必要な変更
- AsyncStorage（非機密データ）
- SecureStore（トークン等）

### 対応方針
```typescript
// lib/storage/index.ts を抽象化
interface Storage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
```

---

## 4. プッシュ通知

### Web版
- 未対応（PWAで一部可能だが制限あり）

### Native版で必要な実装
- Firebase Cloud Messaging (Android)
- Apple Push Notification Service (iOS)
- 通知トークンの管理

### 用途
- 約束のリマインダー
- パートナーからのトーク開始通知

---

## 5. リアルタイム通信

### Web版
- Supabase Realtime（WebSocket）

### Native版
- 同じ（Supabase JS Clientが対応）
- **変更不要**

---

## 6. 画面遷移・ナビゲーション

### Web版
- Next.js App Router
- `useRouter()` / `Link`

### Native版で必要な変更
- React Navigation
- Stack / Tab Navigator

### 対応方針
- ルーティングロジックは分離しにくいため、Native版で書き直し
- ただし、画面構成・遷移フローは共通

---

## 7. UI コンポーネント

### Web版
- Tailwind CSS
- shadcn/ui

### Native版で必要な変更
- React Native StyleSheet
- NativeWind（Tailwind for RN）または独自スタイル
- UIコンポーネントは書き直し

### 対応方針
- デザインシステム（色、フォント、スペーシング）は共通化
- コンポーネントの見た目は合わせるが、実装は別

---

## 8. API呼び出し

### Web版
- `fetch()` / Next.js API Routes

### Native版
- 同じ `fetch()` が使える
- **ほぼ変更不要**

### 注意点
- 環境変数の扱いが異なる（expo-constants）
- API URLの管理

---

## 9. ネットワーク・リアルタイム

### Web版
- SSE（EventSource）でストリーミング受信が可能

### Native版で必要な変更
- React NativeはEventSource非対応のため、SSEは未サポート（polyfillが不安定）
- 音声ストリーミング/文字起こし結果の受信は **WebSocket に寄せる** か、短ポーリング/Chunked fetchで代替

### 対応方針
- STT/翻訳結果配信: Cloud Run 側でWebSocketエンドポイントを提供（可能ならWeb版も同じWebSocketを使う）
- SSEを使うAPIが残る場合は、`react-native-sse`等のpolyfillを検討しつつ、最終的にはWSに統一する

---

## 10. 環境変数・設定

### Web版
- `.env.local` をNext.jsの環境変数として扱う

### Native版で必要な変更
- Expo/React Nativeはビルド時に埋め込む必要がある（`app.config.ts` や `expo-constants`）
- Supabase URL/Anon Key、APIベースURL、Sentry DSNなどを `config/native.ts` などで一元管理

### 対応方針
- `lib/config/index.ts` を作り、環境変数の取得とバリデーションを抽象化
- Web/Nativeで実装を切り替える（`config/native.ts`, `config/web.ts`）

---

## 共通化すべきコード一覧

開発中に確認・更新してください。

| ファイル | 共通化可能 | 備考 |
|---------|-----------|------|
| `lib/api/talks.ts` | ✅ | API呼び出しロジック |
| `lib/api/couples.ts` | ✅ | API呼び出しロジック |
| `lib/api/promises.ts` | ✅ | API呼び出しロジック |
| `lib/utils/format.ts` | ✅ | 日付フォーマット等 |
| `lib/utils/validation.ts` | ✅ | バリデーション |
| `types/*.ts` | ✅ | 型定義 |
| `hooks/useTalk.ts` | ⚠️ | 音声部分は抽象化必要 |
| `hooks/useAuth.ts` | ⚠️ | ストレージ部分は抽象化必要 |
| `components/*` | ❌ | UIは別実装 |

---

## 開発中のメモ

<!-- 開発中に気づいたことを随時追記 -->

### YYYY-MM-DD: メモタイトル
メモ内容をここに記載

---

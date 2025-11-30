# Aibond React Native 開発メモ

このディレクトリには、React Nativeアプリ開発時に必要な変更点や注意事項を記載します。

## 目次

1. [リアルタイム音声文字起こし（STT）](#リアルタイム音声文字起こしstt)

---

## リアルタイム音声文字起こし（STT）

### 現在のWeb実装（SSE）

Web版では **Server-Sent Events (SSE)** を使用してリアルタイム文字起こしを実装しています。

```
[ブラウザ]                           [Next.js Server]              [Google STT V2]
    |                                      |                            |
    |-- GET /api/stt/stream (SSE) -------->|                            |
    |                                      |-- streamingRecognize() --->|
    |<-- event: ready --------------------|                            |
    |                                      |                            |
    |-- POST /api/stt/upload (500ms毎) --->|                            |
    |                                      |-- audio chunk ------------>|
    |<-- event: partial ------------------|<-- interim results --------|
    |<-- event: final --------------------|<-- final results ----------|
```

**SSEを選択した理由:**
- Next.js App RouterでSSEがネイティブサポート
- 単方向通信（サーバー→クライアント）で十分
- WebSocketより実装がシンプル
- 自動再接続機能あり

### React Native実装時の変更点

React Nativeでは **WebSocket** への変更が必要です。

**理由:**
- React NativeのEventSourceサポートが不完全
- ネイティブアプリではWebSocketの方が安定
- バックグラウンド動作時の接続維持が容易

### 推奨アーキテクチャ

```
[React Native App]                    [API Server]                [Google STT V2]
    |                                      |                            |
    |-- WebSocket connect ---------------->|                            |
    |                                      |-- streamingRecognize() --->|
    |<-- message: ready ------------------|                            |
    |                                      |                            |
    |-- message: audio (500ms毎) --------->|                            |
    |                                      |-- audio chunk ------------>|
    |<-- message: partial ----------------|<-- interim results --------|
    |<-- message: final ------------------|<-- final results ----------|
```

### 実装方針

1. **バックエンド**: WebSocket専用エンドポイントを追加
   - `/api/stt/ws` - WebSocket接続用
   - 既存のSSEエンドポイントはWeb用に維持

2. **共通ロジック**: STTセッション管理は共通化
   - `session-store.ts` はそのまま使用可能
   - Google STT V2への接続ロジックも共通

3. **フロントエンド**: React Native側で実装
   - `react-native-websocket` または標準WebSocket API使用
   - AudioWorkletの代わりにネイティブ音声モジュール使用

### 必要なライブラリ（予定）

```json
{
  "dependencies": {
    "react-native-audio-recorder-player": "^3.x",
    "react-native-audio-api": "^0.x"
  }
}
```

### 音声フォーマット

Web/React Native共通:
- サンプルレート: 16kHz
- フォーマット: LINEAR16 (PCM 16bit)
- チャンネル: モノラル
- チャンク間隔: 500ms

---

## 今後の変更点追記

React Native実装時に変更が必要な機能は、このファイルに随時追記していきます。

| 機能 | Web実装 | React Native変更点 | ステータス |
|------|---------|-------------------|-----------|
| STT | SSE | WebSocket | 未実装 |
| TTS | - | - | 未定 |
| 翻訳 | - | - | 未定 |

# Aibond 技術仕様書

**バージョン**: 1.0
**最終更新**: 2025年11月29日

---

## 目次

1. [技術スタック](#1-技術スタック)
2. [アーキテクチャ](#2-アーキテクチャ)
3. [データベース設計](#3-データベース設計)
4. [API仕様](#4-api仕様)
5. [外部API統合](#5-外部api統合)
6. [認証・セキュリティ](#6-認証セキュリティ)
7. [デプロイ・インフラ](#7-デプロイインフラ)
8. [開発環境セットアップ](#8-開発環境セットアップ)
9. [実装フェーズ（段階的開発計画）](#9-実装フェーズ段階的開発計画)

---

## 1. 技術スタック

### 1.1 フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15.x | フレームワーク |
| React | 18.x | UIライブラリ |
| TypeScript | 5.x | 型安全性 |
| Tailwind CSS | 3.x | スタイリング |
| Shadcn/ui | latest | UIコンポーネント |

### 1.2 バックエンド

| 技術 | 用途 |
|------|------|
| Next.js API Routes | APIエンドポイント |
| Supabase | 認証、データベース、リアルタイム |

### 1.3 外部サービス

| サービス | 用途 |
|---------|------|
| Google Cloud Speech-to-Text | 音声認識（ストリーミング + 話者識別） |
| Google Cloud Translation | 翻訳 |
| Google Gemini 2.5 | トークサマリー生成、AI相談 |
| Stripe | 決済・サブスクリプション管理 |

### 1.4 インフラ
- Next.js（SSR + API Routes）を Cloud Run にデプロイ
- Supabase Cloud を Auth / Postgres / Storage / RLS に使用
- Secrets は Cloud Secret Manager で集中管理し Cloud Run に注入
- オブザーバビリティ: Cloud Logging + Supabase ログ（必要に応じ Sentry）

---

## 2. アーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────┐
│                     ユーザー                              │
│              (Browser / React Native)                    │
└────────────┬───────────────────┬────────────────────────┘
             │ HTTP              │ WebSocket
             ↓                   ↓
┌─────────────────────────────────────────────────────────┐
│                   Cloud Run コンテナ                     │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │  Next.js (SSR+API)   │  │  WebSocket Server    │    │
│  │  ・Pages             │  │  (Express + ws)      │    │
│  │  ・API Routes        │  │  ・リアルタイムSTT    │    │
│  │  ・認証/決済/DB操作   │  │  ・リアルタイム翻訳   │    │
│  └──────────────────────┘  └──────────────────────┘    │
│           ポート 3000              ポート 8080           │
└────────┬─────────────────┬────────────────────┬─────────┘
         │                 │                    │
         ↓                 ↓                    ↓
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│   Supabase     │ │  Google Cloud  │ │     Stripe     │
│  ・Auth        │ │  ・STT v2      │ │   (Payment)    │
│  ・PostgreSQL  │ │  ・Translation │ │                │
│  ・Storage     │ │  ・Gemini 2.5  │ │                │
└────────────────┘ └────────────────┘ └────────────────┘
```

**WebSocketサーバーを分離する理由**
- Next.js API RoutesはWebSocketをネイティブサポートしない
- Cloud Run内で同一コンテナに同居させ、内部通信はlocalhost
- Web/React Native両対応（SSEはRNで不安定）

### 2.2 データフロー（リアルタイム会話記録 - WebSocket）

```
┌─────────────┐                    ┌─────────────────────┐
│   Client    │                    │  WebSocket Server   │
│(Browser/RN) │                    │   (Express + ws)    │
└──────┬──────┘                    └──────────┬──────────┘
       │                                      │
       │ 1. WebSocket接続                      │
       │ ─────────────────────────────────────>│
       │                                      │
       │ 2. { type: "start", talkId, config } │
       │ ─────────────────────────────────────>│ → Google STT ストリーム開始
       │                                      │
       │ 3. { type: "connected" }             │
       │ <─────────────────────────────────────│
       │                                      │
       │ 4. { type: "audio", data: base64 }   │
       │ ─────────────────────────────────────>│ → STT に音声送信
       │ ─────────────────────────────────────>│ (100-500ms 毎)
       │ ─────────────────────────────────────>│
       │                                      │
       │ 5. { type: "partial", text, speaker }│
       │ <─────────────────────────────────────│ STT Partial結果
       │                                      │
       │ 6. { type: "final", text, speaker,   │
       │      translation }                   │
       │ <─────────────────────────────────────│ STT Final + 翻訳結果
       │                                      │   → DB保存も実行
       │                                      │
       │ 7. { type: "pause" }                 │
       │ ─────────────────────────────────────>│ 一時停止
       │                                      │
       │ 8. { type: "resume" }                │
       │ ─────────────────────────────────────>│ 再開
       │                                      │
       │ 9. { type: "end" }                   │
       │ ─────────────────────────────────────>│ → STT ストリーム終了
       │                                      │   → 音声ファイルアップロード
       │                                      │
       │ 10. { type: "summary", data }        │
       │ <─────────────────────────────────────│ トークサマリー（Gemini）
       │                                      │
       │ 11. WebSocket切断                     │
       │ ─────────────────────────────────────>│
       │                                      │
```

**WebSocketメッセージ詳細**

| 方向 | type | データ | 説明 |
|------|------|--------|------|
| → | `start` | `{ talkId, mainLang, subLang }` | セッション開始 |
| ← | `connected` | `{}` | 接続完了通知 |
| → | `audio` | `{ data: base64 }` | 音声データ（PCM16） |
| ← | `partial` | `{ text, speaker, timestamp }` | STT中間結果 |
| ← | `final` | `{ text, speaker, translation, timestamp }` | STT確定結果 + 翻訳 |
| → | `pause` | `{}` | 一時停止 |
| → | `resume` | `{}` | 再開 |
| → | `end` | `{}` | セッション終了 |

**再接続ポリシー**
- 通信途絶から60秒以内の再接続は同一セッションに復帰（paused状態で再開）
- 60秒を超えた場合はセッション終了扱い（再接続で新規セッションを要求）

**STT設定**
- Google Speech-to-Text v2 `enableSpeakerDiarization=true`, `min/max_speaker_count=2`
- モデル: 会話時間に応じて `latest_short` / `latest_long` を使い分け
- voice登録は行わない。speakerTagはUIで自分/相手に固定マッピングし、誤判定はUIで修正
- 送信フォーマット: PCM16（16kHz, mono）
| ← | `summary` | `{ summary, promises, nextTopics }` | AI要約結果 |
| ← | `error` | `{ code, message }` | エラー通知 |

**処理フロー詳細**
1. クライアントがWebSocket接続を確立
2. `start`メッセージでSTTストリームを初期化（Google STT v2）
3. クライアントがAudioWorklet/expo-avで音声をPCM16に変換、base64エンコードして送信
4. サーバーがSTTストリームに音声を書き込み
5. STT結果が返ってきたら:
   - Partial: そのままクライアントに送信
   - Final: 翻訳API呼び出し（sub_languageがある場合）→ DB保存 → クライアントに送信
6. `end`メッセージでセッション終了、音声ファイルをSupabase Storageにアップロード
7. Gemini APIでサマリー生成、結果をWebSocketで送信

### 2.3 ディレクトリ構成

```
/Aibond
├── /app                    # Next.js App Router
│   ├── /api               # API Routes (HTTP)
│   │   ├── /auth          # 認証関連
│   │   ├── /partners       # パートナー連携
│   │   ├── /talks         # トーク関連（メタデータ）
│   │   ├── /summary       # AIサマリー
│   │   ├── /ai-chat       # AI相談
│   │   └── /billing       # Stripe決済
│   ├── /home              # ホーム画面
│   ├── /talk              # トーク画面
│   ├── /history           # 会話履歴
│   ├── /promises          # 約束リスト
│   ├── /ai-chat           # AI相談画面
│   ├── /settings          # 設定
│   └── /plans             # プラン選択
├── /server                 # WebSocketサーバー（Express + ws）
│   ├── index.ts           # エントリーポイント
│   ├── /handlers          # メッセージハンドラー
│   │   ├── audio.ts       # 音声データ処理
│   │   ├── session.ts     # セッション管理
│   │   └── summary.ts     # サマリー生成
│   ├── /services          # 外部サービス連携
│   │   ├── stt.ts         # Google STT
│   │   ├── translation.ts # Google Translation
│   │   └── gemini.ts      # Gemini API
│   └── /utils             # ユーティリティ
├── /components            # Reactコンポーネント
│   ├── /ui                # Shadcn/ui
│   ├── /talk              # トーク関連
│   ├── /history           # 履歴表示
│   └── /layout            # レイアウト
├── /lib                   # ユーティリティ（共通）
│   ├── /supabase          # Supabase クライアント
│   ├── /hooks             # カスタムフック
│   │   └── useWebSocket.ts # WebSocket接続フック
│   └── /stripe            # Stripe
├── /types                 # TypeScript型定義
├── /public                # 静的ファイル
│   └── /worklets          # AudioWorklet（PCM16変換）
└── /native                # React Native移行準備
```

**WebSocketサーバーの起動**
- 開発環境: `npm run dev:ws`（ポート8080）
- 本番環境: Cloud Run内でNext.jsと同居（マルチプロセス or Docker Compose）

---

## 3. データベース設計

### 3.1 ER図

```
users ──┬──< subscriptions     ← 個人単位で課金
        │       │
        │       └──< usage      ← 個人単位で使用量管理
        │
        ├──< partnerships >──┬──< talks >──┬──< talk_messages
        │               │             │
        │               │             └──< promises
        │               │
        │               └──< (talks: パートナー連携時のみ)
        │
        ├──< partner_invitations
        │
        └──< ai_consultations   ← 個人単位
                │
                └──< ai_consultation_usage
```

**課金モデル**: 個人単位（パートナー単位ではない）
- subscriptions, usage は `user_id` で管理
- パートナー連携してもしなくても、各自で課金管理

### 3.2 テーブル定義

#### users（Supabase Auth管理）

Supabase Authの`auth.users`テーブルを使用。
追加で`public.user_profiles`テーブルを作成。

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT NOT NULL, -- "ja", "en", "ko", "zh" など（Google対応言語）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**ユーザー登録時の初期化トリガー**
```sql
-- 新規ユーザー登録時に user_profiles, subscriptions, usage を自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  current_period TEXT;
BEGIN
  -- 現在の期間（YYYY-MM）
  current_period := to_char(NOW(), 'YYYY-MM');

  -- user_profiles 作成
  INSERT INTO public.user_profiles (id, name, language)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'ユーザー'), 'ja');

  -- subscriptions 作成（Freeプランで初期化）
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  -- usage 作成（今月分）
  INSERT INTO public.usage (user_id, period, minutes_used, minutes_limit)
  VALUES (NEW.id, current_period, 0, 120); -- Free: 2時間 = 120分

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### partnerships

```sql
CREATE TABLE public.partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partnership_name TEXT, -- 例: "太郎 & Sarah"
  main_language TEXT NOT NULL, -- 会話で使う言語（例: "ja", "en"）
  sub_language TEXT, -- 翻訳先の言語（例: "en", "ja"）。NULLの場合は翻訳OFF
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'unlinked'（解除後は非公開アーカイブ）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_partnership UNIQUE(user1_id, user2_id),
  CONSTRAINT different_users CHECK(user1_id != user2_id),
  CONSTRAINT valid_status CHECK(status IN ('active', 'unlinked'))
  -- 言語はGoogle Cloud Translation APIがサポートする全言語を許可（制約なし）
  -- 例: ja, en, ko, zh, es, fr, de, it, pt, ru, ar, hi, th, vi, id, ms, tl, etc.
);

-- インデックス
CREATE INDEX idx_partnerships_user1 ON partnerships(user1_id);
CREATE INDEX idx_partnerships_user2 ON partnerships(user2_id);
CREATE INDEX idx_partnerships_status ON partnerships(status);
```

**対応言語**
- Google Cloud Translation API がサポートするすべての言語
- 主要言語: ja, en, ko, zh, es, fr, de, it, pt, ru, ar, hi, th, vi, id, ms, tl など
- 言語リストはGoogle APIから動的に取得可能

**ユーザーID正規化ルール**
- `user1_id` と `user2_id` は常に小さいUUIDが `user1_id` になるよう正規化
- これにより同じ2人のパートナーが重複して作成されることを防ぐ
- 連携時: `const [user1_id, user2_id] = [inviterId, accepterId].sort();`

#### partner_invitations

```sql
CREATE TABLE public.partner_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT,
  invite_code TEXT NOT NULL UNIQUE, -- ランダムな招待コード
  status TEXT NOT NULL DEFAULT 'pending', -- "pending", "accepted", "expired"
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK(status IN ('pending', 'accepted', 'expired'))
);

-- インデックス
CREATE INDEX idx_invitations_code ON partner_invitations(invite_code);
CREATE INDEX idx_invitations_inviter ON partner_invitations(inviter_id);

-- 運用ルール
-- ・有効期限は発行から7日
-- ・期限切れ/既にパートナー所属の場合は 409 を返し、再発行を案内
-- ・パートナー解除後もデータは保持（非公開アーカイブ化）。ユーザーからの閲覧/共有/編集/新規追加は不可（内部保管のみ）
-- ・新しいパートナーと連携する場合、旧データを一括削除するボタンを提供（押さなくても旧データ保持のまま新パートナー連携可能）
```

#### talks

```sql
CREATE TABLE public.talks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- トーク作成者（必須）
  partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL, -- パートナーID（NULLable: 連携前は NULL）
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER, -- 実録音時間（分）※一時停止中は含まない
  status TEXT NOT NULL DEFAULT 'active', -- "active", "paused", "completed"
  is_paused BOOLEAN DEFAULT FALSE, -- 一時停止中フラグ
  paused_at TIMESTAMP WITH TIME ZONE, -- 一時停止開始時刻
  total_pause_seconds INTEGER DEFAULT 0, -- 累計一時停止時間（秒）
  summary TEXT, -- AIサマリー
  summary_status TEXT DEFAULT 'pending', -- "pending", "generated", "skipped", "failed"
  promises JSONB, -- 約束リスト（配列）
  next_topics JSONB, -- 次回話すこと（配列）
  -- 話者マッピング（セッション完了後にユーザーが設定）
  speaker1_user_id UUID REFERENCES auth.users(id), -- speaker 1 = このユーザー（パートナー連携時）
  speaker2_user_id UUID REFERENCES auth.users(id), -- speaker 2 = このユーザー（パートナー連携時）
  speaker1_name TEXT, -- speaker 1 の表示名（ソロ使用時に設定可能、例: "自分"）
  speaker2_name TEXT, -- speaker 2 の表示名（ソロ使用時に設定可能、例: "田中さん"）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK(status IN ('active', 'paused', 'completed')),
  CONSTRAINT valid_summary_status CHECK(summary_status IN ('pending', 'generated', 'skipped', 'failed'))
);

-- 連携時に過去トークをパートナーに紐付けるための関数
-- 連携完了時に実行: UPDATE talks SET partnership_id = ? WHERE owner_user_id = ? AND partnership_id IS NULL;

-- インデックス
CREATE INDEX idx_talks_owner ON talks(owner_user_id);
CREATE INDEX idx_talks_partnership ON talks(partnership_id);
CREATE INDEX idx_talks_started ON talks(started_at DESC);
CREATE INDEX idx_talks_status ON talks(status);
```

**話者マッピング機能**
- `speaker1_user_id`, `speaker2_user_id`: セッション完了後にユーザーが設定（パートナー連携時）
- `speaker1_name`, `speaker2_name`: 表示名（ソロ使用時やカスタム名が必要な場合）
- STTの `speakerTag: 1` は `speaker1_user_id` または `speaker1_name` に対応
- マッピングを設定すると、サマリーや約束リストの表示にも反映
- 過去のトークに遡って設定・変更可能
- **表示優先順位**: user_id があればユーザー名、なければ speaker_name、どちらもなければ "Speaker 1/2"

#### talk_messages

```sql
CREATE TABLE public.talk_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talk_id UUID NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  original_language TEXT NOT NULL, -- "ja", "en", "ko", "zh"
  translated_text TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_final BOOLEAN DEFAULT TRUE, -- Partial/Final（Partialは保存しない方針）

  CONSTRAINT non_empty_text CHECK(length(original_text) > 0)
);

-- インデックス
CREATE INDEX idx_messages_talk ON talk_messages(talk_id);
CREATE INDEX idx_messages_timestamp ON talk_messages(timestamp);
```

#### promises

```sql
CREATE TABLE public.promises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 約束作成者（必須）
  partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL, -- パートナーID（NULLable: 連携前は NULL）
  talk_id UUID REFERENCES talks(id) ON DELETE SET NULL, -- どのトークで約束したか（手動追加の場合はNULL可）
  content TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  is_manual BOOLEAN DEFAULT FALSE, -- 手動追加かどうか（true = ユーザーが手動追加、false = AI抽出）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT non_empty_content CHECK(length(content) > 0)
);

-- インデックス
CREATE INDEX idx_promises_owner ON promises(owner_user_id);
CREATE INDEX idx_promises_partnership ON promises(partnership_id);
CREATE INDEX idx_promises_completed ON promises(is_completed);
CREATE INDEX idx_promises_created ON promises(created_at DESC);
CREATE INDEX idx_promises_manual ON promises(is_manual);
```

#### subscriptions（個人単位）

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- 個人単位で課金
  plan TEXT NOT NULL DEFAULT 'free', -- "free", "standard", "premium"
  status TEXT NOT NULL DEFAULT 'active', -- "active", "canceled", "past_due"
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  scheduled_plan TEXT, -- ダウングレード予約時の次回適用プラン（NULL = 変更予定なし）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_plan CHECK(plan IN ('free', 'standard', 'premium')),
  CONSTRAINT valid_status CHECK(status IN ('active', 'canceled', 'past_due')),
  CONSTRAINT valid_scheduled_plan CHECK(scheduled_plan IS NULL OR scheduled_plan IN ('free', 'standard', 'premium'))
);

-- インデックス
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
```

**課金モデル**
- **個人単位の課金**（パートナー単位ではない）
- 1人でも利用可能（Free/有料両方）
- パートナー連携しても、課金は各自で管理
- パートナー割引は設けない

**プラン変更ルール**
- アップグレード：即時適用 + 日割り課金（Stripe proration）
- ダウングレード：`cancel_at_period_end = true`, `scheduled_plan = 'free'` 等を設定し、期間終了時に適用
- 支払い失敗：即時 `plan = 'free'`, `status = 'past_due'` に変更、メール通知を送信

#### usage（個人単位）

```sql
CREATE TABLE public.usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 個人単位で使用量管理
  period TEXT NOT NULL, -- "2025-11"（YYYY-MM）
  minutes_used INTEGER NOT NULL DEFAULT 0, -- トーク終了時に加算する録音時間（分）
  minutes_limit INTEGER NOT NULL, -- プランの上限（分）
  notified_80 BOOLEAN NOT NULL DEFAULT false, -- 80%到達通知済みフラグ
  notified_100 BOOLEAN NOT NULL DEFAULT false, -- 100%到達通知済みフラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_period UNIQUE(user_id, period)
);

-- インデックス
CREATE INDEX idx_usage_user ON usage(user_id);
CREATE INDEX idx_usage_period ON usage(period);
```

**計測ルール**
- **セッションオーナー（トーク開始者）の使用量としてカウント**
- パートナーはトーク閲覧のみ可能、使用量は消費しない
- トーク終了時に経過時間を計算し、15秒単位で切り上げて minutes_used に加算
- クラッシュ時は最後に受信した文字起こし/ハートビートのタイムスタンプを終了時刻とみなす
- セッション中に上限超過した場合、その場でセッションを終了しサマリー生成へ進む
- 使用量が上限の80%に達した場合、メール通知を送信

#### ai_consultations

```sql
CREATE TABLE public.ai_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_history JSONB DEFAULT '[]', -- チャット履歴（配列）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 月間使用量管理テーブル（AI相談）
CREATE TABLE public.ai_consultation_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- "2025-11"（YYYY-MM）
  message_count INTEGER NOT NULL DEFAULT 0, -- 今月のメッセージ数
  message_limit INTEGER NOT NULL DEFAULT 100, -- 月間上限（設定値として外出し）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_period UNIQUE(user_id, period)
);

-- インデックス
CREATE INDEX idx_consultations_user ON ai_consultations(user_id);
CREATE INDEX idx_consultation_usage_user ON ai_consultation_usage(user_id);
CREATE INDEX idx_consultation_usage_period ON ai_consultation_usage(period);
```

**AI相談のプライバシー**
- `ai_consultations` は個人単位で管理（パートナー単位ではない）
- RLSで `auth.uid() = user_id` のみアクセス可能に設定
- パートナーは相手のAI相談履歴を閲覧できない

**チャット履歴の保持ポリシー**
- **全履歴を永久保持**（古いものは削除しない）
- データとしての価値が高いため、すべての相談履歴を残す

**RLSポリシー（AI相談関連）**
```sql
-- ai_consultations テーブルのRLS
ALTER TABLE ai_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consultations"
  ON ai_consultations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultations"
  ON ai_consultations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultations"
  ON ai_consultations FOR UPDATE
  USING (auth.uid() = user_id);

-- ai_consultation_usage テーブルのRLS
ALTER TABLE ai_consultation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consultation usage"
  ON ai_consultation_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultation usage"
  ON ai_consultation_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultation usage"
  ON ai_consultation_usage FOR UPDATE
  USING (auth.uid() = user_id);
```

#### audio_files

```sql
CREATE TABLE public.audio_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talk_id UUID NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- ストレージのパス
  file_size INTEGER NOT NULL, -- ファイルサイズ（バイト）
  duration_seconds INTEGER, -- 音声の長さ（秒）
  codec TEXT DEFAULT 'webm_opus', -- 収録コーデック
  content_type TEXT DEFAULT 'audio/webm', -- MIME
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_talk_audio UNIQUE(talk_id)
);

-- インデックス
CREATE INDEX idx_audio_files_talk ON audio_files(talk_id);

-- 運用ルール
-- ・音声はSupabase Storageのprivateバケットに保存し、署名URLは発行しない
-- ・解約時は非公開アーカイブに移行し1ヶ月後に自動削除（手動削除は即時）
-- ・アカウント削除時は即時削除
```

### 3.3 Row Level Security (RLS)

Supabaseの Row Level Security を使用してアクセス制御。

**基本ポリシー**
- ユーザーは自分が所属するパートナーのデータのみアクセス可能
- 認証されていないユーザーはアクセス不可

```sql
-- partnerships テーブルのRLS
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own partnerships"
  ON partnerships FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert partnerships they belong to"
  ON partnerships FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- talks テーブルのRLS
ALTER TABLE talks ENABLE ROW LEVEL SECURITY;

-- トーク閲覧ポリシー（アーカイブ対応）
-- ・パートナー連携前の個人トーク（partnership_id = NULL）→ 自分が作成したものは閲覧可
-- ・パートナーのトーク → パートナーがactive状態の場合のみ閲覧可
CREATE POLICY "Users can view their own or active partnership's talks"
  ON talks FOR SELECT
  USING (
    (partnership_id IS NULL AND owner_user_id = auth.uid())  -- 連携前の個人トーク
    OR
    EXISTS (  -- activeなパートナーのトーク
      SELECT 1 FROM partnerships
      WHERE partnerships.id = talks.partnership_id
      AND partnerships.status = 'active'
      AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

-- 自分のトークを作成可能（連携前はpartnership_id = NULL）
CREATE POLICY "Users can create their own talks"
  ON talks FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- トーク更新ポリシー（アーカイブ対応）
CREATE POLICY "Users can update their own or active partnership's talks"
  ON talks FOR UPDATE
  USING (
    (partnership_id IS NULL AND owner_user_id = auth.uid())  -- 連携前の個人トーク
    OR
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE partnerships.id = talks.partnership_id
      AND partnerships.status = 'active'
      AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
    )
  );

-- promises テーブルのRLS（同様のパターン）
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promises of active partnerships"
  ON promises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM talks
      WHERE talks.id = promises.talk_id
      AND (
        (talks.partnership_id IS NULL AND talks.owner_user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM partnerships
          WHERE partnerships.id = talks.partnership_id
          AND partnerships.status = 'active'
          AND (partnerships.user1_id = auth.uid() OR partnerships.user2_id = auth.uid())
        )
      )
    )
  );

-- 他のテーブルも同様にRLSを設定
```

---

## 4. API仕様

### 4.1 認証関連

#### POST /api/auth/signup

新規ユーザー登録

**Request**
```json
{
  "email": "taro@example.com",
  "password": "password123",
  "name": "太郎",
  "language": "ja"
}
```

**Response (200)**
```json
{
  "user": {
    "id": "uuid",
    "email": "taro@example.com"
  }
}
```

#### POST /api/auth/login

ログイン

**Request**
```json
{
  "email": "taro@example.com",
  "password": "password123"
}
```

**Response (200)**
```json
{
  "user": { ... },
  "session": { ... }
}
```

### 4.2 パートナー連携

#### POST /api/partners/invite

招待リンクを生成

**Request**
```json
{}
```

**Response (200)**
```json
{
  "inviteCode": "abc123def456",
  "inviteUrl": "https://aibond.com/invite/abc123def456",
  "expiresAt": "2025-12-03T00:00:00Z"
}
```

#### POST /api/partners/accept

招待を承認

**Request**
```json
{
  "inviteCode": "abc123def456",
  "sharePastData": true  // 過去のトーク・約束を相手と共有するか
}
```

**Response (200)**
```json
{
  "partnership": {
    "id": "uuid",
    "user1_id": "uuid",
    "user2_id": "uuid",
    "partnership_name": "太郎 & Sarah",
    "main_language": "ja",
    "sub_language": "en"
  },
  "sharedTalksCount": 5,  // 共有された過去トーク数
  "sharedPromisesCount": 3  // 共有された過去約束数
}
```

**連携時の処理**
```typescript
// ユーザーIDを正規化（小さい方をuser1_idに）
const [sortedUser1, sortedUser2] = [inviterId, accepterId].sort();

// 既存のunlinkedパートナーをチェック（同じ2人が再連携する場合）
const existingPartnership = await db.partnerships.findFirst({
  where: {
    user1_id: sortedUser1,
    user2_id: sortedUser2,
    status: 'unlinked',
  },
});

let partnershipId: string;
if (existingPartnership) {
  // 既存パートナーを再アクティブ化
  await db.partnerships.update({
    where: { id: existingPartnership.id },
    data: { status: 'active' },
  });
  partnershipId = existingPartnership.id;
} else {
  // 新規パートナー作成
  const newPartnership = await db.partnerships.create({
    data: {
      user1_id: sortedUser1,
      user2_id: sortedUser2,
      status: 'active',
      // ...その他フィールド
    },
  });
  partnershipId = newPartnership.id;
}

// 過去データの共有処理
if (sharePastData) {
  // 両ユーザーの過去トークをパートナーに紐付け
  await db.talks.updateMany({
    where: {
      owner_user_id: { in: [sortedUser1, sortedUser2] },
      partnership_id: null,
    },
    data: { partnership_id: partnershipId },
  });

  // 約束も同様
  await db.promises.updateMany({
    where: {
      owner_user_id: { in: [sortedUser1, sortedUser2] },
      partnership_id: null,
    },
    data: { partnership_id: partnershipId },
  });
}
```

#### POST /api/partners/unlink

連携解除

**Request**
```json
{}
```

**Response (200)**
```json
{
  "success": true,
  "message": "連携を解除しました"
}
```

**解除時の処理**
- partnership_id を NULL に戻さない（内部保管用に保持）
- partnerships テーブルの `status` を `'unlinked'` に変更（削除しない）
- RLSにより、解除後はユーザーからトーク・約束が閲覧不可になる（非公開アーカイブ化）
- サブスクリプションは個人単位なので影響なし

**実装**
```typescript
async function unlinkPartnership(userId: string) {
  const partnership = await db.partnerships.findFirst({
    where: {
      OR: [{ user1_id: userId }, { user2_id: userId }],
      status: 'active',
    },
  });

  if (!partnership) throw new Error('アクティブなパートナーが見つかりません');

  await db.partnerships.update({
    where: { id: partnership.id },
    data: { status: 'unlinked' },
  });
}
```

#### DELETE /api/partners/history

アーカイブされた連携履歴をすべて削除（新パートナーと連携する際に使用）

**Request**
```json
{}
```

**Response (200)**
```json
{
  "success": true,
  "deletedPartnerships": 1,
  "deletedTalks": 15,
  "deletedPromises": 8,
  "message": "アーカイブ済みの連携履歴をすべて削除しました"
}
```

**削除対象**（unlinkedなパートナーのデータのみ）
- `status = 'unlinked'` のパートナーレコード
- そのパートナーに紐づくトーク（`partnership_id` が unlinked なパートナーのもの）
- 関連する `talk_messages`、`audio_files`、`promises` も CASCADE で削除

**実装**
```typescript
async function deleteArchivedHistory(userId: string) {
  // 1. unlinkedなパートナーを取得
  const unlinkedPartnerships = await db.partnerships.findMany({
    where: {
      OR: [{ user1_id: userId }, { user2_id: userId }],
      status: 'unlinked',
    },
  });

  const partnershipIds = unlinkedPartnerships.map(c => c.id);
  if (partnershipIds.length === 0) {
    return { deletedPartnerships: 0, deletedTalks: 0 };
  }

  // 2. 該当パートナーのトークを取得
  const talks = await db.talks.findMany({
    where: { partnership_id: { in: partnershipIds } },
    select: { id: true },
  });

  // 3. Storage から音声ファイルを削除
  for (const talk of talks) {
    await supabase.storage
      .from('audio-files')
      .remove([`talks/${talk.id}/*`]);
  }

  // 4. トークを削除（CASCADE で talk_messages, audio_files, promises も削除）
  await db.talks.deleteMany({
    where: { partnership_id: { in: partnershipIds } },
  });

  // 5. パートナーレコードを削除
  await db.partnerships.deleteMany({
    where: { id: { in: partnershipIds } },
  });

  return { deletedPartnerships: partnershipIds.length, deletedTalks: talks.length };
}
```

**注意事項**
- この操作は取り消せない
- 確認ダイアログで「本当に削除しますか？」を表示
- アクティブなパートナーのデータは削除されない（unlinkedのみ対象）
- 新パートナーと連携する前に削除するオプションとして提供

#### GET /api/partners/me

自分のパートナー情報を取得（**activeなパートナーのみ**）

**Response (200)** - アクティブなパートナーがある場合
```json
{
  "partnership": {
    "id": "uuid",
    "user1_id": "uuid",
    "user2_id": "uuid",
    "partnership_name": "太郎 & Sarah",
    "main_language": "ja",
    "sub_language": "en",
    "status": "active",
    "partner": {
      "id": "uuid",
      "name": "Sarah",
      "language": "en"
    }
  },
  "hasArchivedData": false
}
```

**Response (200)** - アクティブなパートナーがない場合
```json
{
  "partnership": null,
  "hasArchivedData": true  // 過去のアーカイブデータがある場合
}
```

**hasArchivedData**
- `true`: 過去にunlinkedになったパートナーのデータが存在する
- 新パートナー連携画面で「旧データを削除」ボタンを表示するために使用

### 4.3 トーク関連

#### POST /api/talks/start

トーク開始

**Request**
```json
{}
```

**Response (200)**
```json
{
  "talk": {
    "id": "uuid",
    "partnership_id": "uuid",
    "started_at": "2025-11-26T10:00:00Z",
    "status": "active"
  }
}
```

#### POST /api/talks/[talkId]/end

トーク終了

**Response (200)**
```json
{
  "talk": {
    "id": "uuid",
    "ended_at": "2025-11-26T10:45:00Z",
    "duration_minutes": 45,
    "status": "completed"
  }
}
```

#### POST /api/talks/[talkId]/pause

トーク一時停止

**Response (200)**
```json
{
  "talk": {
    "id": "uuid",
    "status": "paused",
    "is_paused": true,
    "paused_at": "2025-11-26T10:30:00Z"
  }
}
```

#### POST /api/talks/[talkId]/resume

トーク再開

**Response (200)**
```json
{
  "talk": {
    "id": "uuid",
    "status": "active",
    "is_paused": false,
    "total_pause_seconds": 120
  }
}
```

**一時停止/再開の処理ロジック**
```typescript
// 一時停止
async function pauseTalk(talkId: string) {
  await db.talks.update({
    where: { id: talkId },
    data: {
      status: 'paused',
      is_paused: true,
      paused_at: new Date(),
    },
  });
}

// 再開
async function resumeTalk(talkId: string) {
  const talk = await db.talks.findUnique({ where: { id: talkId } });
  const pauseDuration = (Date.now() - talk.paused_at.getTime()) / 1000;

  await db.talks.update({
    where: { id: talkId },
    data: {
      status: 'active',
      is_paused: false,
      paused_at: null,
      total_pause_seconds: talk.total_pause_seconds + pauseDuration,
    },
  });
}
```

#### GET /api/talks/[talkId]

トーク詳細取得

**Response (200)**
```json
{
  "talk": {
    "id": "uuid",
    "started_at": "2025-11-26T10:00:00Z",
    "ended_at": "2025-11-26T10:45:00Z",
    "duration_minutes": 45,
    "summary": "今日は週末の予定について...",
    "promises": ["日曜日に映画を見に行く"],
    "next_topics": ["来月の旅行の計画"]
  },
  "messages": [
    {
      "id": "uuid",
      "speaker_id": "uuid",
      "original_text": "今週末どうする？",
      "original_language": "ja",
      "translated_text": "What should we do this weekend?",
      "timestamp": "2025-11-26T10:05:00Z"
    }
  ]
}
```

#### GET /api/talks

トーク一覧取得

**Query Parameters**
- `limit`: 件数（デフォルト: 20）
- `offset`: オフセット（デフォルト: 0）

**Response (200)**
```json
{
  "talks": [
    {
      "id": "uuid",
      "started_at": "2025-11-26T10:00:00Z",
      "duration_minutes": 45,
      "summary": "今日は週末の予定について..."
    }
  ],
  "total": 10
}
```

#### PATCH /api/talks/[talkId]/speakers

話者マッピングを設定・更新（セッション完了後）

**Request**
```json
{
  "speaker1_user_id": "uuid",
  "speaker2_user_id": "uuid"
}
```

**Response (200)**
```json
{
  "talk": {
    "id": "uuid",
    "speaker1_user_id": "uuid",
    "speaker2_user_id": "uuid",
    "updated_at": "2025-11-26T11:00:00Z"
  }
}
```

**注意事項**
- セッション完了後（status = "completed"）のみ設定可能
- 過去のトークに遡って設定・変更可能
- 設定後、サマリーや約束リストの表示にも反映

（手動再生成APIはMVPでは提供しない。自動生成が失敗した場合は静かに終了）

### 4.4 リアルタイムSTT・翻訳（WebSocket）

#### WebSocket接続

**エンドポイント**
```
wss://api.aibond.com/ws/talk
```

**認証**
- 接続時にSupabase Access Tokenをクエリパラメータまたはヘッダーで送信
- `wss://api.aibond.com/ws/talk?token={access_token}`

---

#### クライアント → サーバー メッセージ

**1. start - セッション開始**
```json
{
  "type": "start",
  "talkId": "uuid",
  "mainLanguage": "ja",
  "subLanguage": "en"  // null の場合は翻訳なし
}
```

**2. audio - 音声データ送信**
```json
{
  "type": "audio",
  "data": "base64エンコードされたPCM16音声データ",
  "sequence": 1
}
```
- 音声フォーマット: PCM16（16bit, 16kHz, mono）
- 送信間隔: 100-500ms毎（推奨: 250ms）
- データサイズ: 1チャンクあたり約8KB

**3. pause - 一時停止**
```json
{
  "type": "pause"
}
```

**4. resume - 再開**
```json
{
  "type": "resume"
}
```

**5. end - セッション終了**
```json
{
  "type": "end"
}
```

---

#### サーバー → クライアント メッセージ

**1. connected - 接続完了**
```json
{
  "type": "connected",
  "sessionId": "session-uuid"
}
```

**2. partial - STT中間結果**
```json
{
  "type": "partial",
  "text": "今週末",
  "speaker": 1,
  "timestamp": "2025-11-29T10:00:05Z"
}
```

**3. final - STT確定結果 + 翻訳**
```json
{
  "type": "final",
  "id": "message-uuid",
  "text": "今週末どうする？",
  "speaker": 1,
  "speakerId": "user-uuid",
  "translation": "What should we do this weekend?",
  "timestamp": "2025-11-29T10:00:05Z"
}
```
- `translation`はsubLanguageがnullの場合は含まれない

**4. paused - 一時停止完了**
```json
{
  "type": "paused",
  "pausedAt": "2025-11-29T10:15:00Z"
}
```

**5. resumed - 再開完了**
```json
{
  "type": "resumed",
  "totalPauseSeconds": 120
}
```

**6. summary - トークサマリー**
```json
{
  "type": "summary",
  "summary": "今日は週末の予定について話し合いました。",
  "promises": [
    { "content": "日曜日14時に映画館で待ち合わせ", "speaker": 1 }
  ],
  "nextTopics": ["来月の旅行の計画"],
  "speakers": [1, 2]
}
```
- `promises` の各項目に `speaker` を含む（話者マッピング用）
- `speakers` は会話に参加した話者のリスト（1 or 2）

**7. speaker_mapping_required - 話者マッピング要求**
```json
{
  "type": "speaker_mapping_required",
  "talkId": "uuid",
  "speakers": [1, 2],
  "sampleUtterances": [
    { "speaker": 1, "text": "今週末どうする？" },
    { "speaker": 2, "text": "映画でも見に行く？" }
  ]
}
```
- サマリー生成後、話者マッピングダイアログ表示を促す
- `sampleUtterances` は各話者の発言サンプル（識別の参考用）

**8. error - エラー**
```json
{
  "type": "error",
  "code": "STT_ERROR",
  "message": "Speech recognition failed"
}
```

**エラーコード**
| コード | 説明 | クライアント側の対応 |
|--------|------|---------------------|
| `AUTH_ERROR` | 認証失敗 | 再ログインを促す |
| `STT_ERROR` | 音声認識エラー（一時的） | 自動リトライ中と表示 |
| `STT_FATAL_ERROR` | 音声認識エラー（回復不可） | セッション終了、ダイアログ表示 |
| `TRANSLATION_ERROR` | 翻訳エラー | 原文のみ表示、次の発言から再試行 |
| `LIMIT_EXCEEDED` | 使用時間上限超過 | プランアップグレードを促す |
| `SESSION_TIME_LIMIT` | セッション最大時間（4時間）超過 | サマリー画面へ遷移 |
| `INTERNAL_ERROR` | サーバー内部エラー | エラートースト表示 |
| `NETWORK_ERROR` | ネットワーク切断 | 自動再接続試行 |

**STTエラーハンドリング詳細**
```typescript
// サーバー側のSTTエラーハンドリング
sttStream.on('error', async (error) => {
  retryCount++;

  if (retryCount <= MAX_RETRIES) {
    // 一時的エラー → リトライ
    ws.send(JSON.stringify({
      type: 'error',
      code: 'STT_ERROR',
      message: '音声認識に再接続中...',
      retryCount: retryCount,
    }));

    // exponential backoff でリトライ
    await sleep(Math.pow(2, retryCount) * 1000);
    sttStream = await initSTTStream(config);
  } else {
    // リトライ上限 → セッション終了
    ws.send(JSON.stringify({
      type: 'error',
      code: 'STT_FATAL_ERROR',
      message: '音声認識に接続できませんでした。トークを終了します。',
    }));

    // それまでの録音データを保存
    await saveTalkData(talkId);
    ws.close();
  }
});
```

---

#### WebSocketサーバー実装（参考）

```typescript
// server/websocket.ts (Express + ws)
import WebSocket from 'ws';
import { v2 } from '@google-cloud/speech';
import { TranslationServiceClient } from '@google-cloud/translate';

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', async (ws, req) => {
  // 認証チェック
  const token = new URL(req.url!, 'http://localhost').searchParams.get('token');
  const user = await verifySupabaseToken(token);
  if (!user) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  let sttStream: any = null;
  let talkId: string | null = null;
  let subLanguage: string | null = null;

  ws.on('message', async (message) => {
    const msg = JSON.parse(message.toString());

    switch (msg.type) {
      case 'start':
        talkId = msg.talkId;
        subLanguage = msg.subLanguage;
        sttStream = await initSTTStream(msg.mainLanguage, (result) => {
          handleSTTResult(ws, result, subLanguage, talkId);
        });
        ws.send(JSON.stringify({ type: 'connected', sessionId: talkId }));
        break;

      case 'audio':
        if (sttStream) {
          const audioBuffer = Buffer.from(msg.data, 'base64');
          sttStream.write({ audioContent: audioBuffer });
        }
        break;

      case 'pause':
        // 一時停止処理
        break;

      case 'resume':
        // 再開処理
        break;

      case 'end':
        if (sttStream) {
          sttStream.end();
        }
        // サマリー生成 & 送信
        const summary = await generateSummary(talkId);
        ws.send(JSON.stringify({ type: 'summary', ...summary }));
        break;
    }
  });

  ws.on('close', () => {
    if (sttStream) sttStream.end();
  });
});

async function handleSTTResult(ws: WebSocket, result: any, subLanguage: string | null, talkId: string) {
  const text = result.alternatives?.[0]?.transcript || '';
  const speaker = result.speakerTag || 1;

  if (result.isFinal) {
    let translation = null;
    if (subLanguage) {
      translation = await translateText(text, subLanguage);
    }

    // DB保存
    await saveTalkMessage(talkId, text, translation, speaker);

    ws.send(JSON.stringify({
      type: 'final',
      text,
      speaker,
      translation,
      timestamp: new Date().toISOString(),
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'partial',
      text,
      speaker,
      timestamp: new Date().toISOString(),
    }));
  }
}
```

### 4.5 AIサマリー

#### POST /api/summary/generate

トークサマリーを生成

**Request**
```json
{
  "talkId": "uuid"
}
```

**Response (200)**
```json
{
  "summary": "今日は週末の予定について話し合いました。映画を見に行くことに決まりました。",
  "promises": [
    "日曜日14時に映画館で待ち合わせ"
  ],
  "next_topics": [
    "来月の旅行の計画"
  ]
}
```

### 4.6 約束リスト

#### GET /api/promises

約束リスト取得

**Query Parameters**
- `completed`: boolean（オプション）- 完了済みのみ/未完了のみ

**Response (200)**
```json
{
  "promises": [
    {
      "id": "uuid",
      "content": "日曜日14時に映画館で待ち合わせ",
      "is_completed": false,
      "talk_id": "uuid",
      "created_at": "2025-11-26T10:45:00Z"
    }
  ]
}
```

#### POST /api/promises

約束を手動追加

**Request**
```json
{
  "content": "来週末に映画を見に行く",
  "talk_id": "uuid"  // 任意。特定のトークに紐付ける場合
}
```

**Response (201)**
```json
{
  "promise": {
    "id": "uuid",
    "content": "来週末に映画を見に行く",
    "is_completed": false,
    "is_manual": true,
    "created_at": "2025-11-27T10:00:00Z"
  }
}
```

#### PATCH /api/promises/[promiseId]

約束の更新（完了状態、内容の編集）

**Request**
```json
{
  "is_completed": true,
  "content": "来週土曜日に映画を見に行く"  // 任意。編集する場合
}
```

**Response (200)**
```json
{
  "promise": {
    "id": "uuid",
    "content": "来週土曜日に映画を見に行く",
    "is_completed": true,
    "completed_at": "2025-11-27T18:00:00Z",
    "updated_at": "2025-11-27T18:00:00Z"
  }
}
```

#### DELETE /api/promises/[promiseId]

約束を削除

**Response (200)**
```json
{
  "success": true
}
```

### 4.7 サブスクリプション

#### GET /api/billing/subscription

サブスクリプション情報取得（個人単位）

**Response (200)**
```json
{
  "plan": "standard",
  "status": "active",
  "usage": {
    "used": 5,
    "limit": 15,
    "remaining": 10
  },
  "aiConsultation": {
    "used": 25,
    "limit": 100,
    "remaining": 75
  },
  "period": "2025-11",
  "currentPeriodEnd": "2025-12-26T00:00:00Z",
  "scheduledPlan": null
}
```
- `usage` の単位は「録音時間（分）」。トーク終了時に duration_minutes を加算
- `aiConsultation` はAI相談の月間メッセージ数（100件/月）
- 残時間が0未満の場合は新規トーク開始を拒否
- セッション中に上限を超えた場合はその場で終了しサマリー生成へ進む
- `scheduledPlan` はダウングレード予約時の次回適用プラン

#### POST /api/billing/create-checkout-session

Stripe Checkoutセッション作成

**Request**
```json
{
  "plan": "standard"
}
```

**Response (200)**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

#### POST /api/billing/webhook

Stripe Webhookエンドポイント

---

## 5. 外部API統合

### 5.1 Google Cloud Speech-to-Text

**認証**
- サービスアカウントキー（JSON）
- 環境変数: `GOOGLE_APPLICATION_CREDENTIALS`

**使用API**
- `StreamingRecognize` - リアルタイム音声認識

**設定**
```javascript
const config = {
  encoding: 'WEBM_OPUS',
  sampleRateHertz: 48000,
  languageCode: 'ja-JP', // メイン言語のみ（例: 'ja-JP', 'en-US', 'ko-KR', 'zh-CN'）
  enableAutomaticPunctuation: true,
  model: 'latest_long',
  // 🔥 話者識別（Speaker Diarization）を有効化
  enableSpeakerDiarization: true,
  diarizationSpeakerCount: 2, // 2人固定
  diarizationConfig: {
    enableSpeakerDiarization: true,
    minSpeakerCount: 2,
    maxSpeakerCount: 2,
  },
};
```

**話者識別の処理**
```javascript
// APIからの結果例
{
  "text": "今週末どうする？",
  "isFinal": true,
  "speakerTag": 1, // または 2
  "words": [ ... ]
}

// speakerTag を user_id にマッピング
const speakerId = speakerTag === 1 ? partnership.user1_id : partnership.user2_id;
```

**将来拡張: Voiceprint（声紋認識）**
- **現状（2025年11月）**: Google Speech-to-Text v2 は Voice Embedding / Voice Profile をサポートしていない
- **現在の方式**: Speaker Diarization で話者1/2を区別（匿名タグ、初回マッピングで固定）
- **将来の検討事項**:
  - Google API がサポートした場合に対応
  - 代替案: Azure Speaker Recognition API、AWS Voice ID 等
  - 実装時の仕組み:
    1. 初回トーク開始時に「声を登録」フロー
    2. 各ユーザーが10-20秒程度発話して声紋を登録
    3. 以降のトークで声紋マッチングにより話者を特定

### 5.2 Google Cloud Translation

**認証**
- 同上（Speech-to-Textと共通）

**使用API**
- `translate` - テキスト翻訳

**コスト最適化**
- Batch Translation API使用（複数テキストを一度に翻訳）
- **sub_language が NULL の場合は API 呼び出しをスキップ**（翻訳不要なパートナー向け）
- 従量課金のため、翻訳文字数を最小限に抑える設計

**翻訳スキップの判定**
```typescript
// 翻訳が必要かどうかを判定
const shouldTranslate = partnership.sub_language !== null;

if (shouldTranslate) {
  const translated = await translateText(originalText, partnership.sub_language);
  return { original: originalText, translated };
} else {
  return { original: originalText, translated: null };
}
```

### 5.3 Google Gemini 2.5 API

**認証**
- Google Cloud API Key
- 環境変数: `GOOGLE_GEMINI_API_KEY`

**使用ケース**
1. **トークサマリー生成** - 会話内容の自動整理
2. **AI相談チャット** - 個人的な相談機能

**トークサマリー生成**

**プロンプト**
```
あなたは国際パートナーの会話を整理するアシスタントです。
以下の会話内容を分析し、JSON形式で返してください。

会話内容:
{conversation_text}

出力形式:
{
  "summary": "今日話したことの要約（日本語、3-5行）",
  "promises": ["約束1", "約束2"],
  "next_topics": ["次回話すこと1"]
}
```

**実装**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

const prompt = `あなたは国際パートナーの会話を整理するアシスタントです。
以下の会話内容を分析し、JSON形式で返してください。

会話内容:
${conversationText}

出力形式をJSONで返してください。`;

const result = await model.generateContent(prompt);
const response = JSON.parse(result.response.text());
```

**AI相談チャット**

**プロンプト**
```
あなたは国際パートナーの関係改善をサポートするカウンセラーです。
ユーザーの過去の会話履歴を元に、建設的なアドバイスを提供してください。

直近5回のトークサマリー:
{recent_summaries}

ユーザーの質問:
{user_question}
```

**コンテキスト管理**
- **デフォルト**: 直近5回のセッションのサマリーをコンテキストに渡す
- **詳細な質問への対応**: Function Calling機能を使用

**Function Calling定義**
```typescript
const tools = [
  {
    name: "get_talk_messages",
    description: "特定のトークの詳細なメッセージ履歴を取得する。ユーザーが「○月○日に何を話した？」「先週の約束は？」など、特定のトークについて質問した場合に使用。",
    parameters: {
      type: "object",
      properties: {
        talk_id: {
          type: "string",
          description: "取得するトークのID"
        },
        date: {
          type: "string",
          description: "日付指定（YYYY-MM-DD形式）。talk_idが不明な場合に使用"
        },
        keyword: {
          type: "string",
          description: "検索キーワード。特定の話題を探す場合に使用"
        }
      }
    }
  },
  {
    name: "get_promises",
    description: "約束リストを取得する。未完了の約束や特定の期間の約束について質問された場合に使用。",
    parameters: {
      type: "object",
      properties: {
        is_completed: {
          type: "boolean",
          description: "完了済みの約束のみ取得する場合はtrue"
        },
        limit: {
          type: "number",
          description: "取得件数"
        }
      }
    }
  }
];
```

**実装**
```typescript
const chat = model.startChat({
  history: chatHistory,
  tools: tools,
});

const result = await chat.sendMessage(userQuestion);

// Function Calling結果の処理
if (result.response.functionCalls) {
  for (const call of result.response.functionCalls) {
    if (call.name === 'get_talk_messages') {
      const messages = await fetchTalkMessages(call.args);
      // 取得したデータをコンテキストに追加して再度質問
    }
  }
}

const response = result.response.text();
```

**月間上限管理**
- メッセージ送信時に `ai_consultation_usage.message_count` をインクリメント
- `message_count >= message_limit` の場合はエラーを返す
- 月が変わると `period` が更新され、新しいレコードを作成

### 5.4 Stripe

**使用機能**
- Checkout Session: 決済ページ
- Customer Portal: サブスクリプション管理
- Webhook: イベント通知

**Webhookイベント**
- `checkout.session.completed` - 決済完了
- `customer.subscription.updated` - プラン変更
- `customer.subscription.deleted` - キャンセル
- `invoice.payment_failed` - 支払い失敗 → メール通知

### 5.5 メール通知（Supabase Email）

**使用サービス**: Supabase Auth のメール機能を活用

**通知種別**

| 通知タイプ | トリガー | 内容 |
|-----------|---------|------|
| 支払い失敗 | `invoice.payment_failed` Webhook | 支払いに失敗しました。プランがFreeに変更されます。 |
| 使用量警告 | 使用量が80%に到達 | 今月の使用量が80%に達しました。 |
| 使用量上限 | 使用量が100%に到達 | 今月の使用量上限に達しました。 |
| ダウングレード予告 | ダウングレード設定時 | 次回更新日にプランが変更されます。 |

**通知言語**
- **ユーザーの言語設定（user_profiles.language）に合わせて送信**
- メールテンプレートは主要言語（ja, en, ko, zh等）を用意
- 未対応言語の場合は英語でフォールバック

**実装方法**
```typescript
// Supabase Edge Function でメール送信
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPaymentFailedEmail(userEmail: string, userName: string) {
  await resend.emails.send({
    from: 'Aibond <noreply@aibond.com>',
    to: userEmail,
    subject: '【Aibond】お支払いに失敗しました',
    html: `
      <p>${userName}様</p>
      <p>お支払いの処理に失敗しました。プランがFreeに変更されました。</p>
      <p>引き続きご利用いただくには、お支払い情報を更新してください。</p>
      <a href="https://aibond.com/settings/billing">お支払い情報を更新</a>
    `,
  });
}
```

### 5.6 音声ファイル制限

**セッション時間制限**
- 1セッションあたりの最大録音時間: **4時間**
- 4時間経過時点で自動的にセッション終了、サマリー生成へ進む

**ファイルサイズ制限**
- 最大ファイルサイズ: 約500MB（4時間 × WebM Opus の概算）
- Supabase Storage のファイルサイズ上限に準拠

**音声フォーマット（データフロー）**
```
[クライアント]                    [サーバー]                      [Storage]
    │                               │                               │
    │ マイク入力                     │                               │
    ↓                               │                               │
  AudioWorklet                      │                               │
  PCM16 (16kHz, mono)               │                               │
    │                               │                               │
    │ base64 (WebSocket)            │                               │
    └──────────────────────────────→│                               │
                                    │                               │
                                    │ PCM16 → Google STT            │
                                    │ (リアルタイム文字起こし)        │
                                    │                               │
    │                               │                               │
    │ 同時にMediaRecorderで録音      │                               │
    │ WebM/Opus (48kHz)             │                               │
    │                               │                               │
    │ トーク終了時にアップロード      │                               │
    └──────────────────────────────→│──────────────────────────────→│
                                    │                               │
                                    │                    audio_files テーブル
                                    │                    WebM/Opus で保存
```

- **STT用**: PCM16（16kHz, mono）をWebSocketでストリーム送信
- **保存用**: WebM/Opus（48kHz）をトーク終了時にSupabase Storageにアップロード
- 2つのデータフローは独立して動作し、STTの遅延は保存に影響しない

**制限超過時の処理**
```typescript
// セッション開始から4時間経過をチェック
const MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4時間

if (Date.now() - sessionStartTime > MAX_SESSION_DURATION_MS) {
  ws.send(JSON.stringify({
    type: 'error',
    code: 'SESSION_TIME_LIMIT',
    message: 'セッションの最大時間（4時間）に達しました。トークを終了します。',
  }));
  await endSession(talkId);
}
```

---

## 6. 認証・セキュリティ

### 6.1 認証フロー

**Supabase Auth使用**
- Email/Password認証
- Google OAuth（将来）
- Apple OAuth（将来）

**セッション管理**
- JWT（JSON Web Token）
- 有効期限: 7日間
- リフレッシュトークンで自動更新

### 6.2 セキュリティ対策

**データ保護**
- HTTPS必須
- 会話内容は暗号化してDB保存
- Supabase RLSでアクセス制御

**API保護**
- **HTTP APIレートリミット（目安）**:
  - 認証/招待系: 10リクエスト/分/ユーザー
  - トーク開始/終了/サマリー: 10リクエスト/分/ユーザー
  - その他汎用API: 60リクエスト/分/ユーザー
  - 超過時は HTTP 429 + `Retry-After` を返す
- **WebSocketレートリミット**:
  - 同時接続数: 1ユーザー1接続まで（2つ目以降は拒否）
  - メッセージレート: 30メッセージ/秒目安（音声データ送信用、超過時は一時ドロップ）
  - 接続時間上限: プランの月間上限に基づく
- HTTP APIとWebSocketは別カウントで管理
- CORS設定: 自ドメインのみ許可
- CSRFトークン

**プライバシー**
- 会話内容を第三者に提供しない
- AI分析のためにGoogle Geminiに送信（利用規約に明記）
- AI相談履歴はパートナーに非公開（個人単位で管理、ロック保証はしない）
- 解約時: 音声・会話データを非公開アーカイブに移し1ヶ月後に自動削除（手動削除は即時）
- アカウント削除時: 全データ即時削除
- **データエクスポート**: MVP版では非対応

---

## 7. デプロイ・インフラ

### 7.1 開発環境

**ローカル開発**
```bash
# 環境変数
.env.local

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GEMINI_API_KEY=xxx
# OPENAI_API_KEY=sk-xxx （将来のオプション用）

STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**起動**
```bash
npm run dev
```

### 7.2 本番環境（Cloud Run）

**環境変数設定**
- Cloud Secret Manager で管理し Cloud Run のリビジョンに注入
- 本番用のAPI キーを使用（Supabase, Google, Stripe）

**デプロイ例（Cloud Build 使用）**
```bash
# コンテナビルド & デプロイ
gcloud builds submit --tag gcr.io/PROJECT_ID/aibond
gcloud run deploy aibond \
  --image gcr.io/PROJECT_ID/aibond \
  --region=asia-northeast1 \
  --platform=managed \
  --allow-unauthenticated
```

**カスタムドメイン**
- Cloud Run カスタムドメイン設定で aibond.com（例）

**環境分離**
- 当面は単一プロジェクト/単一環境で運用（dev/stg/prodを分けない方針）
- 将来分離する場合は Supabase プロジェクトも複数用意し、Secret を環境別に管理する

### 7.3 Supabase

**プロジェクト設定**
- リージョン: Tokyo (ap-northeast-1)
- プラン: Pro（¥2,500/月〜）

**バックアップ**
- 自動バックアップ: 毎日
- Point-in-Time Recovery: 7日間

### 7.4 モニタリング

**エラー追跡**
- Sentry（推奨）

**パフォーマンス**
- Cloud Monitoring（Cloud Run / STT API）

**ログ**
- Cloud Logging（Cloud Run）
- Supabase ログ

---

## 8. 開発環境セットアップ

### 8.1 前提条件

- Node.js 18+
- npm または yarn
- Git

### 8.2 セットアップ手順

```bash
# 1. リポジトリクローン
git clone https://github.com/yourname/aibond.git
cd aibond

# 2. 依存関係インストール
npm install

# 3. Supabaseプロジェクト作成
# https://supabase.com/ でプロジェクト作成

# 4. データベース初期化
# Supabaseダッシュボードでテーブル作成（SQL実行）

# 5. 環境変数設定
cp .env.example .env.local
# .env.local を編集

# 6. 開発サーバー起動
npm run dev
```

### 8.3 必要なAPI キー

1. **Supabase**
   - URL: プロジェクト設定から取得
   - ANON_KEY: プロジェクト設定から取得
   - SERVICE_ROLE_KEY: プロジェクト設定から取得

2. **Google Cloud**
   - Speech-to-Text API有効化
   - Translation API有効化
   - サービスアカウント作成 → JSONキーダウンロード

3. **Google Gemini**
   - APIキー取得
   - （オプション）OpenAIを使う場合は OPENAI_API_KEY を用意

4. **Stripe**
   - アカウント作成
   - APIキー取得（Test/Live）
   - Webhook設定

---

## 9. 実装フェーズ（段階的開発計画）

エラーを最小限にするため、1機能ずつ段階的に実装します。各フェーズは**独立して動作確認**できる単位で区切っています。

### 9.0 フェーズ概要

```
Phase 0: プロジェクト初期化 + ランディングページ  ← 今ここから
    ↓
Phase 1: 認証基盤
    ↓
Phase 2: ユーザープロフィール
    ↓
Phase 3: パートナー連携 + 履歴削除API
    ↓
Phase 4: トーク基盤 + 使用量チェック
    ↓
Phase 5: WebSocketサーバー基盤
    ↓
Phase 6: 音声録音（フロントエンド）
    ↓
Phase 7: STTストリーミング統合
    ↓
Phase 8: 翻訳機能
    ↓
Phase 9: AIサマリー + 話者マッピングダイアログ
    ↓
Phase 10: 約束リスト（※Phase 9に依存）
    ↓
Phase 11: AI相談チャット
    ↓
Phase 12: Stripe決済 + 支払い失敗メール通知
    ↓
Phase 13: 使用量UI + 警告メール + 月初リセット
    ↓
Phase 14: 本番デプロイ
```

---

### Phase 0: プロジェクト初期化 + ランディングページ

**目標**: Next.js プロジェクトのセットアップとUI基盤の構築 + ランディングページ

**タスク**:
1. Next.js 15 プロジェクト作成（TypeScript）
2. Tailwind CSS セットアップ
3. shadcn/ui インストール・設定
4. デザイントークン設定（`tailwind.config.js`）
5. 基本レイアウト作成（`BottomNav`, `Sidebar`）
6. ディレクトリ構成作成
7. **ランディングページ作成**（ヒーロー、機能紹介、料金プラン、フッター）

**コマンド**:
```bash
npx create-next-app@latest aibond --typescript --tailwind --app --src-dir
cd aibond
npx shadcn@latest init
npx shadcn@latest add button card input
```

**確認ポイント**:
- [ ] `npm run dev` で起動
- [ ] `/` にランディングページ表示
- [ ] Tailwindのスタイルが適用されている
- [ ] レスポンシブ対応（モバイル/デスクトップ）

**成果物**:
- `/app/page.tsx` - ランディングページ
- `/app/layout.tsx` - ルートレイアウト
- `/components/ui/` - shadcn/uiコンポーネント
- `/components/layout/` - BottomNav, Sidebar
- `/components/landing/` - ヒーロー、機能紹介、料金プラン

---

### Phase 1: 認証基盤

**目標**: Supabase Auth でメール認証を実装

**前提**: Supabaseプロジェクト作成済み

**タスク**:
1. Supabase クライアントセットアップ
2. 認証ページ作成（`/signup`, `/login`）
3. 認証状態管理フック作成（`useAuth`）
4. 保護ルート（ミドルウェア）実装
5. ログアウト機能

**ファイル**:
```
/lib/supabase/client.ts      # ブラウザ用クライアント
/lib/supabase/server.ts      # サーバー用クライアント
/lib/supabase/middleware.ts  # 認証ミドルウェア
/hooks/useAuth.ts            # 認証状態フック
/app/(auth)/login/page.tsx   # ログイン画面
/app/(auth)/signup/page.tsx  # サインアップ画面
/middleware.ts               # Next.js ミドルウェア
```

**確認ポイント**:
- [ ] サインアップ → メール確認 → ログイン可能
- [ ] 未認証で `/home` にアクセス → `/login` にリダイレクト
- [ ] ログイン後 `/home` にアクセス可能
- [ ] ログアウトで `/login` にリダイレクト

---

### Phase 2: ユーザープロフィール

**目標**: `user_profiles` テーブルとプロフィール表示

**タスク**:
1. `user_profiles` テーブル作成（SQL）
2. サインアップ時にプロフィール自動作成（トリガー or API）
3. プロフィール表示・編集画面
4. 言語設定機能

**SQL**:
```sql
-- user_profiles テーブル作成
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ja',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- サインアップ時に自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, language)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'ユーザー'), 'ja');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**ファイル**:
```
/app/(main)/settings/page.tsx         # 設定画面
/app/(main)/settings/profile/page.tsx # プロフィール編集
/app/api/profile/route.ts             # プロフィールAPI
```

**確認ポイント**:
- [ ] 新規登録で `user_profiles` にレコード作成
- [ ] 設定画面でプロフィール表示
- [ ] 名前・言語を編集して保存できる

---

### Phase 3: パートナー連携 + 履歴削除API

**目標**: 招待コードによるパートナー連携 + 履歴全削除機能

**タスク**:
1. `partnerships`, `partner_invitations` テーブル作成
2. 招待コード生成API
3. 招待承認API
4. パートナー連携画面（`/partner/setup`）
5. 連携状態表示
6. **連携解除API**
7. **履歴全削除API**（新しいパートナーとの連携前に使用）

**ファイル**:
```
/app/(main)/partner/setup/page.tsx  # パートナー連携画面
/app/api/partners/invite/route.ts   # 招待生成
/app/api/partners/accept/route.ts   # 招待承認
/app/api/partners/me/route.ts       # パートナー情報取得
/app/api/partners/unlink/route.ts   # 連携解除
/app/api/partners/history/route.ts  # 履歴全削除
/hooks/usePartnership.ts                # パートナー状態フック
```

**確認ポイント**:
- [ ] 招待コード生成（7日間有効）
- [ ] 別アカウントでコード入力 → パートナー成立
- [ ] ホーム画面に「太郎 & Sarah」表示
- [ ] 連携済みの場合、`/partner/setup` からリダイレクト
- [ ] 連携解除で両者の連携が解除される
- [ ] 履歴全削除で自分のトーク・約束が削除される

---

### Phase 4: トーク基盤 + 使用量チェック

**目標**: トークのCRUD + 使用量の管理基盤（音声・STTなしでメタデータのみ）

**タスク**:
1. `talks`, `talk_messages` テーブル作成
2. `usage` テーブル作成（使用量管理の基盤）
3. トーク開始API（`POST /api/talks/start`）
   - **上限チェック**: 残り時間が0以下なら開始拒否
4. トーク終了API（`POST /api/talks/[id]/end`）
   - **使用時間加算**: `minutes_used` に加算
5. トーク一覧API（`GET /api/talks`）
6. ホーム画面（`/home`）
7. トーク画面（`/talk/[id]`）基本UI

**ファイル**:
```
/app/(main)/home/page.tsx           # ホーム画面
/app/(main)/talk/[id]/page.tsx      # トーク画面
/app/api/talks/route.ts             # トーク一覧
/app/api/talks/start/route.ts       # トーク開始（上限チェック含む）
/app/api/talks/[id]/route.ts        # トーク詳細
/app/api/talks/[id]/end/route.ts    # トーク終了（使用時間加算含む）
/app/api/usage/route.ts             # 使用状況API（残り時間取得）
/components/talk/TalkHeader.tsx     # 録音ヘッダー
/components/talk/TalkBubble.tsx     # 吹き出し
```

**使用量チェックロジック**:
```typescript
// トーク開始時
async function canStartTalk(userId: string): Promise<boolean> {
  const usage = await getUsage(userId);
  const subscription = await getSubscription(userId);
  const limit = getPlanLimit(subscription.plan); // free:120, standard:900, premium:unlimited

  if (limit === -1) return true; // unlimited
  return usage.minutes_used < limit;
}

// トーク終了時
async function addUsage(userId: string, minutes: number) {
  await db.usage.update({
    where: { user_id: userId, period: getCurrentPeriod() },
    data: { minutes_used: { increment: minutes } },
  });
}
```

**確認ポイント**:
- [ ] ホームで「トークを始める」→ トーク作成
- [ ] トーク画面表示（まだ録音なし）
- [ ] 「終了」→ ステータス `completed` に更新
- [ ] ホームにトーク履歴表示
- [ ] **上限超過時にトーク開始拒否**
- [ ] **トーク終了時に使用時間が加算される**

---

### Phase 5: WebSocketサーバー基盤

**目標**: Express + ws によるWebSocketサーバーの基本構築

**タスク**:
1. `/server` ディレクトリ作成
2. Express + ws セットアップ
3. 認証（Supabaseトークン検証）
4. 接続/切断ハンドリング
5. 基本メッセージ送受信（echo）

**ファイル**:
```
/server/index.ts              # エントリーポイント
/server/auth.ts               # トークン検証
/server/handlers/session.ts   # セッション管理
/server/types.ts              # メッセージ型定義
```

**package.json 追加**:
```json
{
  "scripts": {
    "dev:ws": "ts-node-dev --respawn server/index.ts"
  }
}
```

**確認ポイント**:
- [ ] `npm run dev:ws` でWebSocketサーバー起動（ポート8080）
- [ ] wscat等で接続テスト
- [ ] 不正トークンで接続拒否
- [ ] `start` → `connected` レスポンス確認

---

### Phase 6: 音声録音（フロントエンド）

**目標**: ブラウザで音声を録音しPCM16に変換

**タスク**:
1. AudioWorklet作成（PCM16変換）
2. 録音フック作成（`useAudioRecorder`）
3. 録音UI（開始/一時停止/終了）
4. 音声データをbase64でWebSocketに送信

**ファイル**:
```
/public/worklets/pcm-processor.js  # AudioWorklet
/hooks/useAudioRecorder.ts         # 録音フック
/hooks/useWebSocket.ts             # WebSocket接続フック
/components/talk/RecordingControl.tsx  # 録音コントロール
```

**確認ポイント**:
- [ ] マイク許可リクエスト
- [ ] 録音開始 → AudioWorklet でPCM16変換
- [ ] WebSocket経由でサーバーに音声送信
- [ ] サーバーログで音声データ受信確認

---

### Phase 7: STTストリーミング統合

**目標**: Google STT v2 でリアルタイム文字起こし

**タスク**:
1. Google STT クライアント作成
2. ストリーミング認識セッション管理
3. Partial/Final結果のWebSocket送信
4. 話者識別（Speaker Diarization）
5. フロントでリアルタイム表示

**ファイル**:
```
/server/services/stt.ts       # Google STT サービス
/server/handlers/audio.ts     # 音声処理ハンドラー
/components/talk/MessageList.tsx  # メッセージ一覧
```

**確認ポイント**:
- [ ] 発話 → リアルタイムで文字表示（Partial）
- [ ] 発話終了 → 確定テキスト（Final）
- [ ] 話者識別（speakerTag: 1 or 2）
- [ ] DBに `talk_messages` 保存

---

### Phase 8: 翻訳機能

**目標**: Final結果を翻訳してリアルタイム表示

**タスク**:
1. Google Translation クライアント作成
2. STT Final後に翻訳API呼び出し
3. 翻訳結果をWebSocketで送信
4. 翻訳トグルUI実装
5. `sub_language = null` 時はスキップ

**ファイル**:
```
/server/services/translation.ts    # 翻訳サービス
/components/talk/TranslationToggle.tsx  # 翻訳トグル
```

**確認ポイント**:
- [ ] 日本語発話 → 英語翻訳表示
- [ ] 翻訳トグルで表示切り替え
- [ ] `sub_language = null` で翻訳なし
- [ ] DBに `translated_text` 保存

---

### Phase 9: AIサマリー + 話者マッピングダイアログ

**目標**: トーク終了時にGeminiでサマリー生成 + 話者マッピング機能

**タスク**:
1. Gemini クライアント作成
2. サマリー生成API
3. トーク終了時に自動生成
4. サマリー画面（`/talk/[id]/summary`）
5. 約束の自動抽出
6. **話者マッピングダイアログUI**（サマリー生成後に表示）
7. **話者マッピングAPI**（PATCH /api/talks/[id]/speakers）

**ファイル**:
```
/server/services/gemini.ts              # Gemini サービス
/server/handlers/summary.ts             # サマリー生成
/app/(main)/talk/[id]/summary/page.tsx  # サマリー画面
/components/talk/SpeakerMappingDialog.tsx  # 話者マッピングダイアログ
/app/api/talks/[id]/speakers/route.ts   # 話者マッピングAPI
```

**確認ポイント**:
- [ ] トーク終了 → サマリー自動生成
- [ ] サマリー画面に表示
- [ ] 約束リスト抽出（JSON）
- [ ] DBに `summary`, `promises`, `next_topics` 保存
- [ ] 話者マッピングダイアログが表示される
- [ ] Speaker 1/2 を自分/パートナー/名前入力で設定可能
- [ ] 設定後、サマリーに名前が反映される

---

### Phase 10: 約束リスト

**目標**: 約束の一覧表示と完了管理

**タスク**:
1. `promises` テーブル作成
2. サマリー生成時に約束を自動INSERT
3. 約束一覧API
4. 約束画面（`/promises`）
5. 完了チェック機能

**ファイル**:
```
/app/(main)/promises/page.tsx     # 約束リスト画面
/app/api/promises/route.ts        # 約束一覧
/app/api/promises/[id]/route.ts   # 約束更新
/components/promise/PromiseItem.tsx  # 約束アイテム
```

**確認ポイント**:
- [ ] サマリー生成で約束自動作成
- [ ] 約束リスト画面に表示
- [ ] チェックで完了マーク
- [ ] ホームに「未完了の約束」表示

---

### Phase 11: AI相談チャット

**目標**: 過去の会話を元にAIとチャット

**タスク**:
1. `ai_consultations` テーブル作成
2. AI相談API（チャット履歴管理）
3. AI相談画面（`/ai-chat`）
4. パスワードロック（任意）

**ファイル**:
```
/app/(main)/ai-chat/page.tsx      # AI相談画面
/app/api/ai-chat/route.ts         # AI相談API
/components/ai-chat/ChatMessage.tsx  # チャットメッセージ
```

**確認ポイント**:
- [ ] 質問送信 → AIから回答
- [ ] 過去の会話を参照した回答
- [ ] チャット履歴保存
- [ ] 新規セッション開始

---

### Phase 12: Stripe決済 + 支払い失敗メール通知

**目標**: サブスクリプション決済 + 支払い失敗時のメール通知

**タスク**:
1. Stripe製品・価格作成
2. Checkoutセッション作成API
3. Webhook設定
4. プラン選択画面（`/plans`）
5. Customer Portal連携
6. **支払い失敗メール通知**（Webhook `invoice.payment_failed` 処理）
7. **メール送信ユーティリティ**（`/lib/email.ts`）

**ファイル**:
```
/app/(main)/plans/page.tsx                 # プラン選択
/app/api/billing/create-checkout/route.ts  # Checkout作成
/app/api/billing/webhook/route.ts          # Webhook
/app/api/billing/portal/route.ts           # Customer Portal
/lib/email.ts                              # メール送信ユーティリティ
/emails/payment-failed.tsx                 # 支払い失敗メールテンプレート
```

**確認ポイント**:
- [ ] プラン選択 → Stripe Checkout
- [ ] 決済完了 → `subscriptions` 更新
- [ ] Webhook で `customer.subscription.updated` 処理
- [ ] Customer Portalでプラン変更
- [ ] `invoice.payment_failed` でメール送信
- [ ] メールはユーザーの language 設定に従う

---

### Phase 13: 使用量UI + 警告メール + 月初リセット

**目標**: 使用量の可視化・警告メール・月初リセット処理

**前提**: Phase 4 で `usage` テーブル・上限チェック・使用時間加算は実装済み

**タスク**:
1. 使用状況表示UI（ホームに使用量バー追加）
2. 月初リセット処理（Cloud Scheduler または Supabase Edge Function）
3. **使用量80%到達時のメール通知**
4. **使用量100%到達時のメール通知**
5. 通知フラグ管理（`usage` テーブルに `notified_80`, `notified_100` 追加）

**ファイル**:
```
/components/home/UsageBar.tsx          # 使用量バー
/emails/usage-warning.tsx              # 使用量警告メールテンプレート（80%）
/emails/usage-limit-reached.tsx        # 上限到達メールテンプレート（100%）
/supabase/functions/reset-usage/       # 月初リセット処理
```

**月初リセット処理**:
```sql
-- 毎月1日 0:00 (JST) に実行
UPDATE usage
SET
  minutes_used = 0,
  notified_80 = false,
  notified_100 = false
WHERE period = to_char(NOW() - interval '1 month', 'YYYY-MM');

-- 新しい月のレコードを作成
INSERT INTO usage (user_id, period, minutes_used, minutes_limit)
SELECT id, to_char(NOW(), 'YYYY-MM'), 0, 120
FROM auth.users
ON CONFLICT (user_id, period) DO NOTHING;
```

**確認ポイント**:
- [ ] ホームに使用量バー表示（残り○○分 / ○○分）
- [ ] プランごとの上限が正しく表示
- [ ] 80%到達時にメール送信（1回のみ）
- [ ] 100%到達時にメール送信（1回のみ）
- [ ] メールはユーザーの language 設定に従う
- [ ] 月初にリセットされる

---

### Phase 14: 本番デプロイ

**目標**: Cloud Run へのデプロイ

**タスク**:
1. Dockerfile作成（Next.js + WebSocket）
2. Cloud Build設定
3. Secret Manager設定
4. Cloud Runデプロイ
5. カスタムドメイン設定
6. Supabase本番環境設定

**ファイル**:
```
/Dockerfile
/cloudbuild.yaml
/.env.production
```

**確認ポイント**:
- [ ] ビルド成功
- [ ] Cloud Runで起動
- [ ] WebSocket接続可能
- [ ] カスタムドメインでアクセス
- [ ] HTTPS有効

---

### 9.1 フェーズごとの推定作業時間

| フェーズ | 内容 | 推定時間 |
|---------|------|---------|
| Phase 0 | プロジェクト初期化 | 2-3時間 |
| Phase 1 | 認証基盤 | 3-4時間 |
| Phase 2 | ユーザープロフィール | 2-3時間 |
| Phase 3 | パートナー連携 | 4-5時間 |
| Phase 4 | トーク基盤 + 使用量チェック | 4-5時間 |
| Phase 5 | WebSocketサーバー | 3-4時間 |
| Phase 6 | 音声録音 | 4-5時間 |
| Phase 7 | STTストリーミング | 5-6時間 |
| Phase 8 | 翻訳機能 | 2-3時間 |
| Phase 9 | AIサマリー | 3-4時間 |
| Phase 10 | 約束リスト | 2-3時間 |
| Phase 11 | AI相談チャット | 3-4時間 |
| Phase 12 | Stripe決済 + 支払い失敗メール通知 | 4-5時間 |
| Phase 13 | 使用量UI + 警告メール + 月初リセット | 2-3時間 |
| Phase 14 | 本番デプロイ | 3-4時間 |
| **合計** | | **約46-57時間** |

### 9.2 依存関係

```
Phase 0 ─┬─→ Phase 1 ─→ Phase 2 ─→ Phase 3 ─→ Phase 12 ─→ Phase 13
         │
         └─→ Phase 4 ─→ Phase 5 ─→ Phase 6 ─→ Phase 7 ─→ Phase 8 ─→ Phase 9 ─→ Phase 10 ─→ Phase 11

全フェーズ完了 ─→ Phase 14
```

### 9.3 各フェーズの完了基準

**各フェーズで以下を満たすこと**:
1. ✅ 全タスク完了
2. ✅ 確認ポイントすべてパス
3. ✅ エラーなくビルド通過
4. ✅ 主要機能の手動テスト完了
5. ✅ コードをコミット

**次フェーズに進む前に**:
- 現フェーズが完全に動作することを確認
- 不具合があれば修正してから次へ

---

**次のステップ**: ビジネス概要（BUSINESS_OVERVIEW.md）の作成

# 絆ノート - 既存テーマへの適切な振り分け仕様

## 📋 概要

会話から抽出された絆ノート項目を、既存のテーマに適切に振り分けることで、重複テーマの作成を防ぎ、管理しやすい絆ノート構造を維持する。

## 🎯 目的

- 既存テーマと新規項目の意味的な類似性を判定
- 適切なテーマに項目を追加することで重複テーマを防止
- ユーザーが絆ノートを整理しやすくする

## ❌ 現在の問題

### 問題シナリオ
```
既存状態:
  テーマ: 家事分担 (ID: abc-123)
    - 項目: 週2回の掃除

新しい会話:
  「洗濯は週2回で協力する」

現在の挙動:
  ✗ 新規テーマ: 家事分担 (ID: xyz-789) を作成
  ✗ 項目: 週2回の洗濯 を新規テーマに追加

結果:
  「家事分担」テーマが2つ存在 → 管理が困難
```

## ✅ 理想の挙動

```
既存状態:
  テーマ: 家事分担 (ID: abc-123)
    - 項目: 週2回の掃除

新しい会話:
  「洗濯は週2回で協力する」

理想の挙動:
  ✓ 既存テーマ「家事分担」を特定
  ✓ topicId: abc-123 を指定
  ✓ 項目: 週2回の洗濯 を既存テーマに追加

結果:
  テーマ: 家事分担 (ID: abc-123)
    - 項目: 週2回の掃除
    - 項目: 週2回の洗濯
```

## 🏗️ 実装アプローチ

### 1. 既存テーマ情報の拡充

**現状**: テーマのIDとタイトルのみ提供
```typescript
existingTopics: Array<{
  id: string;
  title: string;
}>
```

**改善案**: テーマに含まれる項目も提供して文脈を理解しやすくする
```typescript
existingTopics: Array<{
  id: string;
  title: string;
  items: Array<{
    content: string;
    type: string;
  }>;
  itemCount: number;
}>
```

### 2. プロンプト改善

#### 現在のプロンプト（問題点）

```
【既存の絆ノートテーマ】
- ID: abc-123, タイトル: 家事分担
- ID: def-456, タイトル: 育児

【テーマの判定ルール】
1. 抽出した内容が既存テーマのいずれかと意味的に類似している場合
   → そのテーマの topicId を使用
2. 類似する既存テーマがない場合
   → topicId=null、topicTitle に適切な新規タイトルを設定
3. 類似判定は「同じカテゴリの話題か」「同じ文脈か」で判断
```

**問題点**:
- 「意味的に類似」が曖昧
- 既存テーマの具体的な内容がわからない
- 判断基準が不明確

#### 改善後のプロンプト

```
【既存の絆ノートテーマ】
以下は現在登録されている絆ノートのテーマとその内容です：

## テーマ1: 家事分担 (ID: abc-123)
登録済み項目（3件）:
- 週2回の掃除（約束、担当: 自分）
- ゴミ出しは毎週火曜（約束、担当: パートナー）
- 料理の分担を相談中（検討事項、担当: 両者）

## テーマ2: 育児 (ID: def-456)
登録済み項目（2件）:
- 保育園の送りは交代制（約束、担当: 両者）
- 寝かしつけの方法を検討（検討事項、担当: 両者）

【テーマの判定ルール - 重要】

**ステップ1: 既存テーマとの類似性を厳密に判定**
新しく抽出した項目ごとに、以下の基準で既存テーマとの類似性を評価してください：

✓ **同じテーマに追加すべきケース**:
  - 項目の内容が既存テーマの範囲内（例: 「洗濯」→「家事分担」）
  - 同じカテゴリーの話題（例: 「掃除機の購入」→「家事分担」）
  - 既存項目と関連する話題（例: 「料理の献立」→「家事分担」に料理があれば）

  → このケースでは topicId に既存テーマのIDを設定

✗ **新規テーマを作成すべきケース**:
  - 既存テーマのどれとも関連性が低い（例: 「旅行の計画」）
  - 新しいカテゴリーの話題（例: 「ペットの世話」が初出）
  - 既存テーマのタイトルでは表現できない内容

  → このケースでは topicId=null、topicTitle に新規タイトルを設定

**ステップ2: 判定の具体例**

例1: 会話「洗濯は週2回で協力する」
  既存テーマに「家事分担」があり、掃除・ゴミ出しの項目がある
  → 判定: 洗濯は家事の一種で既存テーマに合致
  → 結果: topicId="abc-123"（家事分担）

例2: 会話「週末に温泉旅行に行きたい」
  既存テーマに「家事分担」「育児」のみ
  → 判定: 旅行は既存テーマのどれとも関連性が低い
  → 結果: topicId=null, topicTitle="旅行・レジャー"

例3: 会話「夕食後の皿洗いを交代でやる」
  既存テーマに「家事分担」があり、料理関連の項目がある
  → 判定: 皿洗いは家事、食事関連で既存テーマに合致
  → 結果: topicId="abc-123"（家事分担）

**ステップ3: 曖昧なケースの対応**
どちらとも判断しにくい場合は、**既存テーマを優先**してください。
理由: ユーザーは後から統合・移動が可能ですが、重複テーマの削除は手間がかかるため。
```

### 3. コード実装の変更点

#### 3.1 confirm/route.ts の変更

**現在**:
```typescript
// 既存の継続中のテーマを取得
const { data: topics } = await supabase
  .from("kizuna_topics")
  .select("id, title")
  .eq("partnership_id", talk.partnership_id)
  .eq("status", "active")
  .is("deleted_at", null)
  .order("updated_at", { ascending: false });

existingTopics = topics || [];
```

**改善後**:
```typescript
// 既存の継続中のテーマと項目を取得
const { data: topics } = await supabase
  .from("kizuna_topics")
  .select(`
    id,
    title,
    kizuna_items!inner (
      content,
      type,
      assignee
    )
  `)
  .eq("partnership_id", talk.partnership_id)
  .eq("status", "active")
  .is("deleted_at", null)
  .eq("kizuna_items.status", "active")
  .order("updated_at", { ascending: false })
  .limit(10); // 最新10テーマまで

// 整形
existingTopics = (topics || []).map(topic => ({
  id: topic.id,
  title: topic.title,
  items: topic.kizuna_items.slice(0, 5).map((item: any) => ({
    content: item.content,
    type: item.type,
    assignee: item.assignee,
  })),
  itemCount: topic.kizuna_items.length,
}));
```

#### 3.2 gemini/client.ts の型定義変更

```typescript
export async function generateIntegratedSummary(
  messages: Array<{
    speaker_tag: number;
    original_text: string;
    speaker_name?: string;
  }>,
  existingTopics: Array<{
    id: string;
    title: string;
    items: Array<{
      content: string;
      type: string;
      assignee?: string;
    }>;
    itemCount: number;
  }> = [],
  recentItems?: Array<{...}>,
  existingManualItems?: Array<{...}>
): Promise<IntegratedSummaryResult>
```

#### 3.3 プロンプト生成部分の変更

```typescript
// 既存トピックのリスト（詳細版）
const topicsListText = existingTopics.length > 0
  ? existingTopics.map((t, idx) => {
      const itemsList = t.items
        .map(item => `- ${item.content}（${item.type}、担当: ${item.assignee || '未設定'}）`)
        .join('\n');

      return `
## テーマ${idx + 1}: ${t.title} (ID: ${t.id})
登録済み項目（${t.itemCount}件）:
${itemsList}
${t.itemCount > t.items.length ? `（他${t.itemCount - t.items.length}件）` : ''}
`;
    }).join('\n')
  : "なし（新規作成が必要です）";
```

## 📊 期待される効果

### Before（現状）
```
テーマ数: 15個
- 家事分担 (3項目)
- 家事分担 (2項目) ← 重複
- 育児 (5項目)
- 育児 (1項目) ← 重複
- 子育て (2項目) ← 育児と重複
...

問題:
- 重複テーマが多数存在
- どのテーマに追加すべきか迷う
- 全体像が把握しにくい
```

### After（改善後）
```
テーマ数: 8個
- 家事分担 (5項目) ← 統合
- 育児 (6項目) ← 統合
- 旅行・レジャー (3項目)
...

改善点:
- 重複テーマが大幅に減少
- テーマ構造が明確
- 関連項目が1箇所に集約
- 管理・閲覧が容易
```

## 🧪 テストケース

### ケース1: 明確な既存テーマへの追加

**既存**:
```
テーマ: 家事分担 (ID: abc-123)
  - 項目: 週2回の掃除
  - 項目: ゴミ出しは火曜日
```

**会話**: 「洗濯は週2回で協力する」

**期待される出力**:
```json
{
  "bondNoteItems": [
    {
      "topicId": "abc-123",
      "topicTitle": null,
      "type": "promise",
      "assignee": "both",
      "content": "週2回の洗濯"
    }
  ]
}
```

### ケース2: 新規テーマの作成

**既存**:
```
テーマ: 家事分担 (ID: abc-123)
テーマ: 育児 (ID: def-456)
```

**会話**: 「来月の連休に温泉旅行に行く予定」

**期待される出力**:
```json
{
  "bondNoteItems": [
    {
      "topicId": null,
      "topicTitle": "旅行・レジャー",
      "type": "discussion",
      "assignee": "both",
      "content": "来月の連休に温泉旅行"
    }
  ]
}
```

### ケース3: 類似した既存テーマへの振り分け

**既存**:
```
テーマ: 家事分担 (ID: abc-123)
  - 項目: 料理は交代で
  - 項目: 買い物は週末に

テーマ: 食事・健康 (ID: ghi-789)
  - 項目: 週3回は自炊する
  - 項目: 野菜を多く摂る
```

**会話**: 「夕食後の皿洗いを交代でやる」

**期待される出力** (皿洗いは料理関連なので家事分担へ):
```json
{
  "bondNoteItems": [
    {
      "topicId": "abc-123",
      "topicTitle": null,
      "type": "promise",
      "assignee": "both",
      "content": "夕食後の皿洗いを交代"
    }
  ]
}
```

## 🔄 実装の優先順位

### Phase 1: 基本改善（すぐ実装可能）
1. ✅ プロンプトの改善（判定ルールの明確化）
2. ✅ 具体例の追加
3. ✅ 「曖昧な場合は既存優先」ルールの追加

### Phase 2: データ拡充（中期）
1. ✅ 既存テーマに含まれる項目情報の追加
2. ✅ テーマごとの項目数の表示
3. ✅ 最新10テーマに制限（コンテキスト削減）

### Phase 3: 高度な改善（長期）
1. ⏳ ユーザーフィードバックに基づく機械学習
2. ⏳ テーマの自動統合提案
3. ⏳ 類似テーマの検出アラート

## 📝 実装時の注意点

### データベースクエリのパフォーマンス
```typescript
// ❌ N+1クエリを避ける
for (const topic of topics) {
  const items = await supabase
    .from("kizuna_items")
    .select("*")
    .eq("topic_id", topic.id);
}

// ✅ JOIN で一括取得
const topics = await supabase
  .from("kizuna_topics")
  .select(`
    id,
    title,
    kizuna_items!inner (content, type)
  `)
  .eq("partnership_id", partnershipId);
```

### Gemini APIのトークン制限
- 既存テーマの項目は最大5件まで
- 既存テーマは最新10件まで
- 合計で約2000トークン以内に収める

### エラーハンドリング
```typescript
// 既存テーマの取得に失敗した場合
if (!topics || topics.length === 0) {
  console.warn("[Confirm] No existing topics found, will create new ones");
  existingTopics = [];
}
```

## 🎓 ユーザーへの説明

### ヘルプテキスト案
```
💡 テーマの自動振り分けについて

絆ノートでは、会話から抽出された項目を既存のテーマに自動的に振り分けます。

例:
- 既に「家事分担」テーマがある場合
  → 洗濯、掃除、料理などは自動的にこのテーマに追加されます

- 新しいカテゴリーの話題の場合
  → 「旅行」「ペット」など、新しいテーマが作成されます

もし振り分けが適切でない場合は、後から別のテーマに移動できます。
```

## 🔍 モニタリング指標

実装後、以下の指標で効果を測定：

1. **重複テーマ率**: 同じタイトルのテーマ数 / 総テーマ数
   - 目標: 5%以下

2. **既存テーマ活用率**: topicId指定された項目数 / 総項目数
   - 目標: 70%以上

3. **ユーザー修正率**: ユーザーが手動でテーマを変更した回数
   - 目標: 10%以下

4. **平均テーマ数**: ユーザーあたりの平均テーマ数
   - 目標: 15テーマ以下（現状20テーマから改善）

## 📚 参考資料

- Gemini API ドキュメント: https://ai.google.dev/
- 既存実装: `/web/src/lib/gemini/client.ts`
- データベーススキーマ: `/web/supabase/migrations/`

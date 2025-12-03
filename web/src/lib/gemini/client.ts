/**
 * Google Gemini API クライアント
 *
 * トークサマリー生成、AI相談チャットに使用
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

/**
 * Gemini クライアントを取得（シングルトン）
 */
function getClient(): GoogleGenerativeAI {
  if (genAI) {
    return genAI;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

/**
 * サマリー生成結果の型
 */
export interface SummaryResult {
  summary: string;
  promises: Array<{
    content: string;
    speaker: number;
  }>;
  nextTopics: string[];
}

/**
 * 絆ノート生成結果の型
 */
export interface BondNoteItem {
  // 大カテゴリー
  topicId?: string; // 既存カテゴリーに該当する場合
  topicTitle?: string; // 新規作成する場合

  // 約束・要望・検討
  type: 'promise' | 'request' | 'discussion'; // 種類
  assignee: 'self' | 'partner' | 'both'; // 担当
  reviewDate?: string; // 見直し期間（YYYY-MM-DD）
  content: string; // 内容

  // 紐付け情報
  feeling?: string; // 気持ち（任意）
  partnerFeeling?: string; // 相手の気持ち（任意）
  memo?: string; // メモ（任意）
}

export interface BondNoteGenerationResult {
  items: BondNoteItem[];
}

/**
 * トークサマリーを生成
 */
export async function generateTalkSummary(
  messages: Array<{
    speaker_tag: number;
    original_text: string;
    speaker_name?: string;
  }>
): Promise<SummaryResult> {
  if (messages.length === 0) {
    return {
      summary: "会話内容がありません。",
      promises: [],
      nextTopics: [],
    };
  }

  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  // 会話内容をテキストに変換
  const conversationText = messages
    .map((m) => {
      const speaker = m.speaker_name || `話者${m.speaker_tag}`;
      return `${speaker}: ${m.original_text}`;
    })
    .join("\n");

  const prompt = `あなたは国際カップル・パートナーの会話を整理するアシスタントです。
以下の会話内容を分析し、JSON形式で返してください。

会話内容:
${conversationText}

以下のJSON形式で返してください（他の文章は含めないでください）:
{
  "summary": "今日話したことの要約（日本語、3-5行程度）",
  "promises": [
    { "content": "約束の内容", "speaker": 1 }
  ],
  "nextTopics": ["次回話すこと1", "次回話すこと2"]
}

注意事項:
- summaryは会話の主なトピックと結論をまとめてください
- promisesは「〜する」「〜しよう」などの約束や決定事項を抽出してください。なければ空配列[]
- speakerは約束を言った人の番号（1または2）
- nextTopicsは話が途中で終わった話題や、次回話したいと言及されたことを抽出。なければ空配列[]
- 必ず有効なJSONのみを返してください`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("[Gemini] Raw response:", text);

    // JSONを抽出（マークダウンコードブロックを除去）
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText) as SummaryResult;

    return {
      summary: parsed.summary || "要約を生成できませんでした。",
      promises: parsed.promises || [],
      nextTopics: parsed.nextTopics || [],
    };
  } catch (error) {
    console.error("[Gemini] Error generating summary:", error);
    return {
      summary: "サマリーの生成中にエラーが発生しました。",
      promises: [],
      nextTopics: [],
    };
  }
}

/**
 * 絆ノート生成
 */
export async function generateBondNoteItems(
  messages: Array<{
    speaker_tag: number;
    original_text: string;
    speaker_name?: string;
  }>,
  existingTopics: Array<{
    id: string;
    title: string;
  }>,
  recentItems?: Array<{
    topic_title: string;
    type: string;
    assignee: string | null;
    review_period: string | null;
    content: string;
  }>
): Promise<BondNoteGenerationResult> {
  if (messages.length === 0) {
    return { items: [] };
  }

  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  // 会話内容をテキストに変換
  const conversationText = messages
    .map((m) => {
      const speaker = m.speaker_name || `話者${m.speaker_tag}`;
      return `${speaker}: ${m.original_text}`;
    })
    .join("\n");

  // 既存トピックのリスト
  const topicsListText = existingTopics.length > 0
    ? existingTopics.map(t => `- ID: ${t.id}, タイトル: ${t.title}`).join("\n")
    : "なし（新規作成が必要です）";

  // 過去の項目からパターンを学習
  const learningContext = recentItems && recentItems.length > 0
    ? `
過去の絆ノート項目（参考にしてパターンを学習してください）:
${recentItems.slice(0, 30).map(item => `
- テーマ: ${item.topic_title}
  種類: ${item.type}
  担当: ${item.assignee || '未指定'}
  見直し期間: ${item.review_period || '未指定'}
  内容: ${item.content}
`).join('\n')}

上記から以下のパターンを学習してください:
1. よく使われるテーマカテゴリー
2. 責任分担の傾向（誰がどんなことを担当することが多いか）
3. 見直し期間の傾向（どのくらいの期間を設定することが多いか）
4. 表現やフレーズの特徴
`
    : "";

  const prompt = `あなたはパートナーの会話から「絆ノート」の項目を抽出するアシスタントです。
会話内容を分析し、約束事、要望、検討すべきことを抽出してJSON形式で返してください。

会話内容:
${conversationText}

既存の継続中のテーマ（カテゴリー）:
${topicsListText}
${learningContext}

以下のJSON形式で返してください（他の文章は含めないでください）:
{
  "items": [
    {
      "topicId": "既存テーマのIDまたはnull",
      "topicTitle": "新規テーマの場合のタイトル（例: 家事分担、デート計画）",
      "type": "promise | request | discussion",
      "assignee": "self | partner | both",
      "reviewDate": "YYYY-MM-DD形式の見直し日（1週間〜1ヶ月後が目安、なければnull）",
      "content": "項目の内容",
      "feeling": "話者1の気持ちや感情（あれば）",
      "partnerFeeling": "話者2の気持ちや感情（あれば）",
      "memo": "補足メモ（あれば）"
    }
  ]
}

抽出ルール:
1. **テーマの判定**:
   - 既存テーマに該当する場合は topicId を設定
   - 該当しない場合は topicId=null、topicTitle に適切な名前を設定

2. **項目の抽出**:
   - promise: 「〜する」「〜しよう」などの約束や決定事項
   - request: 「〜してほしい」「〜したい」などの要望やお願い
   - discussion: 「〜を考えよう」「〜について話し合おう」などの検討事項

3. **担当者**:
   - 話者1がやると言った → "self"
   - 話者2がやると言った → "partner"
   - 二人で取り組む → "both"

4. **見直し日**:
   - 具体的な日付が出た場合はその日付
   - 「来週」「1ヶ月後」など相対的な表現 → 適切な日付に変換
   - 期限がない場合 → null

5. **気持ち・メモ**:
   - 感情表現があれば feeling/partnerFeeling に記録
   - 補足情報があれば memo に記録

重要: 必ず有効なJSONのみを返してください。項目がない場合は {"items": []} を返してください。`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("[Gemini] Bond note raw response:", text);

    // JSONを抽出（マークダウンコードブロックを除去）
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText) as BondNoteGenerationResult;

    return {
      items: parsed.items || [],
    };
  } catch (error) {
    console.error("[Gemini] Error generating bond note items:", error);
    return { items: [] };
  }
}

/**
 * 取説アイテムの型
 */
export interface ManualItem {
  question: string;
  answer: string;
  category: string;
}

/**
 * AI相談チャット用のプロンプトを構築
 */
function buildChatPrompt(
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  recentSummaries: string[],
  userManualItems?: ManualItem[],
  partnerManualItems?: ManualItem[]
): string {
  const systemPrompt = `あなたはの役割は、建設的にユーザーの相談に乗ることです。
パートナーとの過去の会話履歴、取説の内容を加味して、ユーザーからの質問に回答してください。
回答は質問の言語で回答してください。`;

  const contextPrompt = recentSummaries.length > 0
    ? `\n\n直近の会話サマリー:\n${recentSummaries.join("\n\n")}`
    : "";

  // 取説情報を追加
  let manualPrompt = "";
  if (userManualItems && userManualItems.length > 0) {
    const userManualText = userManualItems
      .filter(item => item.answer && item.answer.trim().length > 0)
      .map(item => `- ${item.question}: ${item.answer}`)
      .join("\n");
    if (userManualText) {
      manualPrompt += `\n\nユーザー自身の取説（性格や好みなど）:\n${userManualText}`;
    }
  }
  if (partnerManualItems && partnerManualItems.length > 0) {
    const partnerManualText = partnerManualItems
      .filter(item => item.answer && item.answer.trim().length > 0)
      .map(item => `- ${item.question}: ${item.answer}`)
      .join("\n");
    if (partnerManualText) {
      manualPrompt += `\n\nパートナーの取説（性格や好みなど）:\n${partnerManualText}`;
    }
  }

  const historyText = chatHistory
    .map((h) => `${h.role === "user" ? "ユーザー" : "AI"}: ${h.content}`)
    .join("\n");

  return `${systemPrompt}${contextPrompt}${manualPrompt}

${historyText ? `これまでの相談履歴:\n${historyText}\n\n` : ""}ユーザー: ${userMessage}
`;
}

/**
 * AI相談チャット用のレスポンス生成（非ストリーミング）
 */
export async function generateAIChatResponse(
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  recentSummaries: string[],
  userManualItems?: ManualItem[],
  partnerManualItems?: ManualItem[]
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  const fullPrompt = buildChatPrompt(userMessage, chatHistory, recentSummaries, userManualItems, partnerManualItems);

  try {
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("[Gemini] Error generating chat response:", error);
    throw new Error("AI応答の生成に失敗しました");
  }
}

/**
 * AI相談チャット用のストリーミングレスポンス生成
 */
export async function* generateAIChatResponseStream(
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  recentSummaries: string[],
  userManualItems?: ManualItem[],
  partnerManualItems?: ManualItem[]
): AsyncGenerator<string, void, unknown> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  const fullPrompt = buildChatPrompt(userMessage, chatHistory, recentSummaries, userManualItems, partnerManualItems);

  try {
    const result = await model.generateContentStream(fullPrompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  } catch (error) {
    console.error("[Gemini] Error generating chat response stream:", error);
    throw new Error("AI応答の生成に失敗しました");
  }
}

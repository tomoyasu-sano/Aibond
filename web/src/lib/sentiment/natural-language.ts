/**
 * Google Cloud Natural Language API クライアント
 *
 * テキストの感情分析を行う
 */

import { LanguageServiceClient } from "@google-cloud/language";

let client: LanguageServiceClient | null = null;

/**
 * Natural Language クライアントを取得（シングルトン）
 */
function getClient(): LanguageServiceClient {
  if (client) {
    return client;
  }

  const credentialsPath = process.env.AIBOND_GCP_CREDENTIALS_PATH;
  if (credentialsPath) {
    client = new LanguageServiceClient({
      keyFilename: credentialsPath,
    });
  } else {
    // デフォルト認証（Cloud Run等）
    client = new LanguageServiceClient();
  }

  return client;
}

/**
 * 感情分析結果の型
 */
export interface SentimentResult {
  /** 感情スコア（-1.0 〜 1.0）: ネガティブ〜ポジティブ */
  score: number;
  /** 感情の強度（0 〜 ∞）: 感情の強さ */
  magnitude: number;
}

/**
 * 文ごとの感情分析結果
 */
export interface SentenceSentiment {
  text: string;
  score: number;
  magnitude: number;
  speakerTag: number;
}

/**
 * テキスト全体の感情分析結果
 */
export interface DocumentSentimentResult {
  /** ドキュメント全体の感情 */
  documentSentiment: SentimentResult;
  /** 各文の感情 */
  sentences: SentenceSentiment[];
}

/**
 * 単一テキストの感情を分析
 */
export async function analyzeSentiment(
  text: string,
  language: string = "ja"
): Promise<SentimentResult> {
  const client = getClient();

  const [result] = await client.analyzeSentiment({
    document: {
      content: text,
      type: "PLAIN_TEXT",
      language,
    },
  });

  return {
    score: result.documentSentiment?.score ?? 0,
    magnitude: result.documentSentiment?.magnitude ?? 0,
  };
}

/**
 * テキストの感情を文ごとに分析
 *
 * @param messages - 分析対象のメッセージ配列
 * @param language - 分析言語（デフォルト: ja）
 */
export async function analyzeTextSentiments(
  messages: Array<{ text: string; speakerTag: number }>,
  language: string = "ja"
): Promise<DocumentSentimentResult> {
  const client = getClient();

  // メッセージを1つのテキストに結合（文ごとの分析用）
  // ただし、話者情報を保持するために別々に処理
  const sentenceResults: SentenceSentiment[] = [];
  let totalScore = 0;
  let totalMagnitude = 0;
  let validCount = 0;

  // 各メッセージを個別に分析
  for (const message of messages) {
    if (!message.text || message.text.trim().length === 0) {
      continue;
    }

    try {
      const [result] = await client.analyzeSentiment({
        document: {
          content: message.text,
          type: "PLAIN_TEXT",
          language,
        },
      });

      const score = result.documentSentiment?.score ?? 0;
      const magnitude = result.documentSentiment?.magnitude ?? 0;

      sentenceResults.push({
        text: message.text,
        score,
        magnitude,
        speakerTag: message.speakerTag,
      });

      totalScore += score;
      totalMagnitude += magnitude;
      validCount++;
    } catch (error) {
      console.error("[NL API] Error analyzing message:", error);
      // エラーが発生しても続行
    }
  }

  const avgScore = validCount > 0 ? totalScore / validCount : 0;
  const avgMagnitude = validCount > 0 ? totalMagnitude / validCount : 0;

  return {
    documentSentiment: {
      score: avgScore,
      magnitude: avgMagnitude,
    },
    sentences: sentenceResults,
  };
}

/**
 * バッチ処理で複数のテキストを分析
 * API制限を考慮して遅延を入れる
 *
 * @param texts - 分析対象のテキスト配列
 * @param language - 分析言語
 * @param delayMs - リクエスト間の遅延（ミリ秒）
 */
export async function analyzeTextsBatch(
  texts: Array<{ text: string; speakerTag: number }>,
  language: string = "ja",
  delayMs: number = 100
): Promise<SentenceSentiment[]> {
  const results: SentenceSentiment[] = [];

  for (const item of texts) {
    if (!item.text || item.text.trim().length === 0) {
      continue;
    }

    try {
      const sentiment = await analyzeSentiment(item.text, language);
      results.push({
        text: item.text,
        score: sentiment.score,
        magnitude: sentiment.magnitude,
        speakerTag: item.speakerTag,
      });

      // API制限を考慮した遅延
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error("[NL API] Batch error for text:", item.text.substring(0, 50), error);
    }
  }

  return results;
}

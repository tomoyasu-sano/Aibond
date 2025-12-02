/**
 * 話し合い分析サービス
 *
 * Natural Language APIとGemini APIを組み合わせて、
 * 会話の感情分析、建設性評価、相互理解度評価を行う
 */

import {
  analyzeTextsBatch,
  type SentenceSentiment,
} from "./natural-language";
import { generateSentimentEvaluation } from "./gemini-evaluation";
import type {
  TalkSentiment,
  TalkSentimentInsights,
  SentimentStatus,
  SkipReason,
  TimeOfDay,
} from "@/types/database";

// 分析設定
const CONFIG = {
  // 分析実行の最低条件
  MIN_SENTENCES: 10,
  MIN_CHARACTERS: 200,

  // 短文処理のしきい値
  SHORT_TEXT_THRESHOLD: 10, // 文字数
  SHORT_TEXT_MAGNITUDE_THRESHOLD: 0.3, // magnitude

  // 感情分類のしきい値
  POSITIVE_THRESHOLD: 0.20,
  NEGATIVE_THRESHOLD: -0.20,

  // volatilityスコア計算のしきい値
  VOLATILITY_LOW_THRESHOLD: 0.10,
  VOLATILITY_MID_THRESHOLD: 0.30,
};

/**
 * 分析用のメッセージ形式
 */
export interface AnalysisMessage {
  text: string;
  speakerTag: number;
  speakerName?: string;
}

/**
 * 分析結果
 */
export interface AnalysisResult {
  status: SentimentStatus;
  skipReason: SkipReason;
  sentiment?: {
    positiveRatio: number;
    neutralRatio: number;
    negativeRatio: number;
    user1PositiveRatio: number;
    user1NegativeRatio: number;
    user2PositiveRatio: number;
    user2NegativeRatio: number;
    rawVolatilityStddev: number;
    volatilityScore: number;
    sentenceCount: number;
    totalCharacters: number;
  };
  evaluation?: {
    constructivenessScore: number;
    understandingScore: number;
    insights: TalkSentimentInsights;
  };
  overallScore?: number;
}

/**
 * 過去の分析データ（比較用）
 */
export interface PreviousAnalysis {
  date: string;
  constructivenessScore: number;
  understandingScore: number;
  volatilityScore: number;
  overallComment: string;
}

/**
 * 時間帯を判定
 */
export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * 標準偏差を計算
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * volatilityスコア（1-10）を計算
 */
function calculateVolatilityScore(stddev: number): number {
  let score: number;

  if (stddev <= CONFIG.VOLATILITY_LOW_THRESHOLD) {
    // 1-3: 穏やかで安定した会話
    score = 1 + (stddev / CONFIG.VOLATILITY_LOW_THRESHOLD) * 2;
  } else if (stddev <= CONFIG.VOLATILITY_MID_THRESHOLD) {
    // 3-7: 適度な感情表現
    score =
      3 +
      ((stddev - CONFIG.VOLATILITY_LOW_THRESHOLD) /
        (CONFIG.VOLATILITY_MID_THRESHOLD - CONFIG.VOLATILITY_LOW_THRESHOLD)) *
        4;
  } else {
    // 7-10: 感情の波が激しい
    score =
      7 +
      Math.min(
        ((stddev - CONFIG.VOLATILITY_MID_THRESHOLD) /
          (CONFIG.VOLATILITY_MID_THRESHOLD - CONFIG.VOLATILITY_LOW_THRESHOLD)),
        1
      ) *
        3;
  }

  // 1-10の範囲にクリップ
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * 総合スコアを計算
 */
function calculateOverallScore(
  constructiveness: number,
  understanding: number,
  volatility: number
): number {
  // volatilityは低い方が良いので反転（11 - volatility）
  const invertedVolatility = 11 - volatility;
  const score = (constructiveness + understanding + invertedVolatility) / 3;
  return Math.round(score * 10) / 10;
}

/**
 * メッセージが分析対象かどうかを判定
 * - 10文字以上: 対象
 * - 10文字未満でもmagnitude > 0.3: 対象（感情が強い発言）
 * - 10文字未満かつmagnitude <= 0.3: 除外（相槌など）
 */
function shouldIncludeMessage(
  text: string,
  magnitude: number
): boolean {
  if (text.length >= CONFIG.SHORT_TEXT_THRESHOLD) {
    return true;
  }
  return magnitude > CONFIG.SHORT_TEXT_MAGNITUDE_THRESHOLD;
}

/**
 * 感情を分類
 */
function classifySentiment(score: number): "positive" | "neutral" | "negative" {
  if (score > CONFIG.POSITIVE_THRESHOLD) return "positive";
  if (score < CONFIG.NEGATIVE_THRESHOLD) return "negative";
  return "neutral";
}

/**
 * 話し合いの感情分析を実行
 *
 * @param messages - 分析対象のメッセージ配列
 * @param language - 分析言語
 * @param previousAnalyses - 過去の分析データ（直近3回）
 * @param talkInfo - 会話のメタデータ
 */
export async function analyzeTalk(
  messages: AnalysisMessage[],
  language: string = "ja",
  previousAnalyses: PreviousAnalysis[] = [],
  talkInfo?: {
    datetime?: string;
    timeOfDay?: string;
    duration?: number;
    user1Name?: string;
    user2Name?: string;
  }
): Promise<AnalysisResult> {
  // 事前チェック: メッセージ数
  if (messages.length < CONFIG.MIN_SENTENCES) {
    return {
      status: "insufficient_data",
      skipReason: "too_few_sentences",
    };
  }

  // 事前チェック: 合計文字数
  const totalChars = messages.reduce((sum, m) => sum + m.text.length, 0);
  if (totalChars < CONFIG.MIN_CHARACTERS) {
    return {
      status: "insufficient_data",
      skipReason: "too_short",
    };
  }

  // 事前チェック: 話者数
  const speakerTags = new Set(messages.map((m) => m.speakerTag));
  if (speakerTags.size < 2) {
    return {
      status: "insufficient_data",
      skipReason: "single_speaker",
    };
  }

  try {
    // Natural Language APIで感情分析
    console.log("[Sentiment] Analyzing", messages.length, "messages");

    const sentimentResults = await analyzeTextsBatch(
      messages.map((m) => ({ text: m.text, speakerTag: m.speakerTag })),
      language
    );

    // 短文ルールを適用してフィルタリング
    const filteredResults = sentimentResults.filter((r) =>
      shouldIncludeMessage(r.text, r.magnitude)
    );

    console.log(
      "[Sentiment] Filtered:",
      sentimentResults.length,
      "->",
      filteredResults.length,
      "messages"
    );

    if (filteredResults.length < CONFIG.MIN_SENTENCES) {
      return {
        status: "insufficient_data",
        skipReason: "too_few_sentences",
      };
    }

    // 感情分類とカウント
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    const user1Results: SentenceSentiment[] = [];
    const user2Results: SentenceSentiment[] = [];

    for (const result of filteredResults) {
      const sentiment = classifySentiment(result.score);
      if (sentiment === "positive") positiveCount++;
      else if (sentiment === "negative") negativeCount++;
      else neutralCount++;

      if (result.speakerTag === 1) {
        user1Results.push(result);
      } else {
        user2Results.push(result);
      }
    }

    const total = filteredResults.length;
    const positiveRatio = Math.round((positiveCount / total) * 100);
    const neutralRatio = Math.round((neutralCount / total) * 100);
    const negativeRatio = Math.round((negativeCount / total) * 100);

    // 話者別の感情バランス
    const user1Positive = user1Results.filter(
      (r) => classifySentiment(r.score) === "positive"
    ).length;
    const user1Negative = user1Results.filter(
      (r) => classifySentiment(r.score) === "negative"
    ).length;
    const user2Positive = user2Results.filter(
      (r) => classifySentiment(r.score) === "positive"
    ).length;
    const user2Negative = user2Results.filter(
      (r) => classifySentiment(r.score) === "negative"
    ).length;

    const user1Total = user1Results.length || 1;
    const user2Total = user2Results.length || 1;

    const user1PositiveRatio = Math.round((user1Positive / user1Total) * 100);
    const user1NegativeRatio = Math.round((user1Negative / user1Total) * 100);
    const user2PositiveRatio = Math.round((user2Positive / user2Total) * 100);
    const user2NegativeRatio = Math.round((user2Negative / user2Total) * 100);

    // volatility計算（スコアの標準偏差）
    const scores = filteredResults.map((r) => r.score);
    const rawStddev = calculateStdDev(scores);
    const volatilityScore = calculateVolatilityScore(rawStddev);

    console.log("[Sentiment] Raw stddev:", rawStddev, "Volatility score:", volatilityScore);

    // Gemini APIで高度な評価
    const transcript = messages
      .map((m) => {
        const speaker = m.speakerName || `話者${m.speakerTag}`;
        return `${speaker}: ${m.text}`;
      })
      .join("\n");

    const evaluation = await generateSentimentEvaluation({
      transcript,
      positiveRatio,
      neutralRatio,
      negativeRatio,
      rawStddev,
      previousAnalyses,
      talkInfo: {
        datetime: talkInfo?.datetime || new Date().toISOString(),
        timeOfDay: talkInfo?.timeOfDay || getTimeOfDay(new Date()),
        duration: talkInfo?.duration || 0,
        user1Name: talkInfo?.user1Name || "話者1",
        user2Name: talkInfo?.user2Name || "話者2",
        user1Language: language,
        user2Language: language,
      },
      outputLanguage: language,
    });

    // 総合スコア計算
    const overallScore = calculateOverallScore(
      evaluation.constructivenessScore,
      evaluation.understandingScore,
      volatilityScore
    );

    return {
      status: "completed",
      skipReason: null,
      sentiment: {
        positiveRatio,
        neutralRatio,
        negativeRatio,
        user1PositiveRatio,
        user1NegativeRatio,
        user2PositiveRatio,
        user2NegativeRatio,
        rawVolatilityStddev: Math.round(rawStddev * 10000) / 10000,
        volatilityScore,
        sentenceCount: filteredResults.length,
        totalCharacters: totalChars,
      },
      evaluation: {
        constructivenessScore: evaluation.constructivenessScore,
        understandingScore: evaluation.understandingScore,
        insights: evaluation.insights,
      },
      overallScore,
    };
  } catch (error) {
    console.error("[Sentiment] Analysis error:", error);
    return {
      status: "failed",
      skipReason: null,
    };
  }
}

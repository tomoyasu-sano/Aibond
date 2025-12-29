/**
 * Gemini APIを使用した高度な評価
 *
 * 建設性スコアと相互理解度スコアを生成
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TalkSentimentInsights } from "@/types/database";
import type { PreviousAnalysis } from "./analysis";

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
 * 評価入力データ
 */
export interface EvaluationInput {
  transcript: string;
  positiveRatio: number;
  neutralRatio: number;
  negativeRatio: number;
  rawStddev: number;
  previousAnalyses: PreviousAnalysis[];
  talkInfo: {
    datetime: string;
    timeOfDay: string;
    duration: number;
    user1Name: string;
    user2Name: string;
    user1Language: string;
    user2Language: string;
  };
  outputLanguage: string;
}

/**
 * 評価結果
 */
export interface EvaluationResult {
  constructivenessScore: number;
  understandingScore: number;
  insights: TalkSentimentInsights;
}

/**
 * 過去データのフォーマット
 */
function formatPreviousAnalyses(analyses: PreviousAnalysis[]): string {
  if (analyses.length === 0) {
    return "※過去データはありません";
  }

  return analyses
    .map((a, i) => {
      const label =
        i === 0 ? "前回" : i === 1 ? "前々回" : `${i + 1}回前`;
      return `### ${label}の会話（${a.date}）
- 建設性: ${a.constructivenessScore}/10
- 相互理解度: ${a.understandingScore}/10
- 感情の起伏: ${a.volatilityScore}/10
- 総評: ${a.overallComment}`;
    })
    .join("\n\n");
}

/**
 * Gemini APIで会話の建設性と相互理解度を評価
 */
export async function generateSentimentEvaluation(
  input: EvaluationInput
): Promise<EvaluationResult> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const previousDataText = formatPreviousAnalyses(input.previousAnalyses);

  const prompt = `あなたはカップルのコミュニケーション専門家です。
以下の会話内容を分析し、指定のJSON形式で評価してください。

## 会話情報
- 日時: ${input.talkInfo.datetime}
- 時間帯: ${input.talkInfo.timeOfDay}
- 会話時間: ${input.talkInfo.duration}分
- 話者: ${input.talkInfo.user1Name}（言語: ${input.talkInfo.user1Language}）, ${input.talkInfo.user2Name}（言語: ${input.talkInfo.user2Language}）

## 過去の会話データ
${previousDataText}
${input.previousAnalyses.length === 0 ? "※過去データがない場合、comparisonWithPreviousは空文字にしてください" : ""}

## Natural Language APIによる感情分析結果
- ポジティブ発言: ${input.positiveRatio}%
- ニュートラル発言: ${input.neutralRatio}%
- ネガティブ発言: ${input.negativeRatio}%
- 感情の起伏度（標準偏差）: ${input.rawStddev.toFixed(4)}

## 会話内容
${input.transcript}

## 評価基準

### 建設性スコア（1-10）
- 1-3: 非建設的（批判のみ、堂々巡り、解決策なし）
- 4-6: 普通（問題提起はあるが具体策が不十分）
- 7-10: 建設的（具体的な解決策、行動計画、約束がある）
※気持ちの共有が目的の会話でも、共感ができていれば4-6は妥当

### 相互理解度スコア（1-10）
- 1-3: 一方的（相手の話を聞いていない、遮っている）
- 4-6: 普通（聞いているが深い理解には至っていない）
- 7-10: 高い（相手の立場を理解、確認質問、共感がある）

## 出力形式（JSON）
{
  "constructivenessScore": 1-10の整数,
  "understandingScore": 1-10の整数,
  "insights": {
    "goodPoints": ["良かった点を2-3個（具体的に）"],
    "concerns": ["気になる点を0-2個（なければ空配列）"],
    "suggestions": ["次回へのアドバイスを1-2個"]
  },
  "comparisonWithPrevious": "前回/前々回と比べての変化（過去データがある場合のみ、なければ空文字）",
  "overallComment": "30-50文字程度の総評（ポジティブなトーンで）"
}

重要：
- 過度に批判的にならず、改善に繋がる建設的なフィードバックを心がけてください
- ネガティブな結果でも、努力や良い点を必ず見つけてください
- ${input.outputLanguage === "en" ? "英語" : "日本語"}で出力してください
- 必ず有効なJSONのみを返してください`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("[Gemini Evaluation] Raw response:", text.substring(0, 200));

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

    const parsed = JSON.parse(jsonText) as {
      constructivenessScore: number;
      understandingScore: number;
      insights: {
        goodPoints: string[];
        concerns: string[];
        suggestions: string[];
      };
      comparisonWithPrevious: string;
      overallComment: string;
    };

    // スコアを1-10の範囲にクリップ
    const constructivenessScore = Math.max(
      1,
      Math.min(10, Math.round(parsed.constructivenessScore))
    );
    const understandingScore = Math.max(
      1,
      Math.min(10, Math.round(parsed.understandingScore))
    );

    return {
      constructivenessScore,
      understandingScore,
      insights: {
        goodPoints: parsed.insights?.goodPoints || [],
        concerns: parsed.insights?.concerns || [],
        suggestions: parsed.insights?.suggestions || [],
        comparisonWithPrevious: parsed.comparisonWithPrevious || "",
        overallComment:
          parsed.overallComment || "話し合いの記録ができました。",
      },
    };
  } catch (error) {
    console.error("[Gemini Evaluation] Error:", error);

    // エラー時のデフォルト値
    return {
      constructivenessScore: 5,
      understandingScore: 5,
      insights: {
        goodPoints: ["話し合いを続けようとする姿勢が見られます"],
        concerns: [],
        suggestions: ["引き続きお互いの気持ちを共有してみてください"],
        comparisonWithPrevious: "",
        overallComment: "話し合いの記録ができました。",
      },
    };
  }
}

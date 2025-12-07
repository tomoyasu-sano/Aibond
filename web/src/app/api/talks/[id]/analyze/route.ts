/**
 * 話し合い分析API
 *
 * POST /api/talks/{talkId}/analyze - 感情分析を実行
 * GET /api/talks/{talkId}/analyze - 分析結果を取得
 */

import { createClient } from "@/lib/supabase/server";
import { analyzeTalk, getTimeOfDay, type PreviousAnalysis } from "@/lib/sentiment";
import { NextResponse } from "next/server";
import type { TalkSentiment, TimeOfDay } from "@/types/database";

/**
 * GET - 分析結果を取得
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 分析結果を取得
  const { data: sentiment, error } = await supabase
    .from("talk_sentiments")
    .select("*")
    .eq("talk_id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // レコードが見つからない場合
      return NextResponse.json({ sentiment: null });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sentiment });
}

/**
 * POST - 感情分析を実行
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // トークを取得
  const { data: talk, error: talkError } = await supabase
    .from("talks")
    .select("*")
    .eq("id", id)
    .single();

  if (talkError || !talk) {
    return NextResponse.json({ error: "Talk not found" }, { status: 404 });
  }

  // アクセス権限確認
  if (talk.owner_user_id !== user.id) {
    if (talk.partnership_id) {
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("id")
        .eq("id", talk.partnership_id)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();

      if (!partnership) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  // 既存の分析結果があるか確認
  const { data: existingSentiment } = await supabase
    .from("talk_sentiments")
    .select("id, status")
    .eq("talk_id", id)
    .single();

  if (existingSentiment && existingSentiment.status === "completed") {
    // 再分析を強制するパラメータがない場合はスキップ
    const url = new URL(request.url);
    if (!url.searchParams.get("force")) {
      return NextResponse.json({
        message: "Analysis already exists",
        sentimentId: existingSentiment.id,
      });
    }
  }

  // メッセージを取得
  const { data: messages, error: messagesError } = await supabase
    .from("talk_messages")
    .select("speaker_tag, original_text")
    .eq("talk_id", id)
    .eq("is_final", true)
    .order("timestamp", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  if (!messages || messages.length === 0) {
    // データ不足として保存
    const sentimentData = {
      talk_id: id,
      partnership_id: talk.partnership_id,
      status: "insufficient_data",
      skip_reason: "too_few_sentences",
      analyzed_at: new Date().toISOString(),
      analysis_language: "ja",
    };

    if (existingSentiment) {
      await supabase
        .from("talk_sentiments")
        .update(sentimentData)
        .eq("id", existingSentiment.id);
    } else {
      await supabase.from("talk_sentiments").insert(sentimentData);
    }

    return NextResponse.json({
      status: "insufficient_data",
      skipReason: "too_few_sentences",
      message: "この会話は分析に必要なデータが不足しています",
    });
  }

  // 過去3回分の分析結果を取得
  let previousAnalyses: PreviousAnalysis[] = [];
  if (talk.partnership_id) {
    const { data: previousSentiments } = await supabase
      .from("talk_sentiments")
      .select("*, talks(started_at)")
      .eq("partnership_id", talk.partnership_id)
      .eq("status", "completed")
      .neq("talk_id", id)
      .order("analyzed_at", { ascending: false })
      .limit(3);

    if (previousSentiments) {
      previousAnalyses = previousSentiments.map((s) => ({
        date: new Date(s.talks?.started_at || s.analyzed_at).toLocaleDateString("ja-JP"),
        constructivenessScore: s.constructiveness_score || 5,
        understandingScore: s.understanding_score || 5,
        volatilityScore: s.volatility_score || 5,
        overallComment: (s.ai_insights as { overallComment?: string })?.overallComment || "",
      }));
    }
  }

  // 分析を実行
  const analysisMessages = messages.map((m) => ({
    text: m.original_text,
    speakerTag: m.speaker_tag,
    speakerName: m.speaker_tag === 1 ? talk.speaker1_name : talk.speaker2_name,
  }));

  const talkStartedAt = new Date(talk.started_at);
  const result = await analyzeTalk(
    analysisMessages,
    "ja", // TODO: ユーザーの言語設定を使用
    previousAnalyses,
    {
      datetime: talk.started_at,
      timeOfDay: getTimeOfDay(talkStartedAt),
      duration: talk.duration_minutes || 0,
      user1Name: talk.speaker1_name || "話者1",
      user2Name: talk.speaker2_name || "話者2",
    }
  );

  // 結果を保存
  const sentimentData: Partial<TalkSentiment> = {
    talk_id: id,
    partnership_id: talk.partnership_id,
    status: result.status,
    skip_reason: result.skipReason,
    analyzed_at: new Date().toISOString(),
    analysis_language: "ja",
    analysis_version: "v1",
    talk_duration_minutes: talk.duration_minutes,
    talk_time_of_day: getTimeOfDay(talkStartedAt) as TimeOfDay,
    talk_day_of_week: talkStartedAt.getDay(),
  };

  if (result.status === "completed" && result.sentiment && result.evaluation) {
    Object.assign(sentimentData, {
      positive_ratio: result.sentiment.positiveRatio,
      neutral_ratio: result.sentiment.neutralRatio,
      negative_ratio: result.sentiment.negativeRatio,
      user1_positive_ratio: result.sentiment.user1PositiveRatio,
      user1_negative_ratio: result.sentiment.user1NegativeRatio,
      user2_positive_ratio: result.sentiment.user2PositiveRatio,
      user2_negative_ratio: result.sentiment.user2NegativeRatio,
      raw_volatility_stddev: result.sentiment.rawVolatilityStddev,
      volatility_score: result.sentiment.volatilityScore,
      sentence_count: result.sentiment.sentenceCount,
      total_characters: result.sentiment.totalCharacters,
      constructiveness_score: result.evaluation.constructivenessScore,
      understanding_score: result.evaluation.understandingScore,
      overall_score: result.overallScore,
      ai_insights: result.evaluation.insights,
    });
  }

  let savedSentiment;
  if (existingSentiment) {
    const { data, error } = await supabase
      .from("talk_sentiments")
      .update(sentimentData)
      .eq("id", existingSentiment.id)
      .select()
      .single();

    if (error) {
      console.error("[Analyze] Error updating sentiment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    savedSentiment = data;
  } else {
    const { data, error } = await supabase
      .from("talk_sentiments")
      .insert(sentimentData)
      .select()
      .single();

    if (error) {
      console.error("[Analyze] Error inserting sentiment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    savedSentiment = data;
  }

  // レスポンスを返す
  if (result.status === "completed") {
    return NextResponse.json({
      status: "completed",
      sentiment: {
        positiveRatio: result.sentiment?.positiveRatio,
        neutralRatio: result.sentiment?.neutralRatio,
        negativeRatio: result.sentiment?.negativeRatio,
        volatilityScore: result.sentiment?.volatilityScore,
        constructivenessScore: result.evaluation?.constructivenessScore,
        understandingScore: result.evaluation?.understandingScore,
        overallScore: result.overallScore,
      },
      insights: result.evaluation?.insights,
      sentimentId: savedSentiment.id,
    });
  } else {
    return NextResponse.json({
      status: result.status,
      skipReason: result.skipReason,
      message:
        result.skipReason === "too_few_sentences"
          ? "この会話は発言数が少なく分析できません（10発言以上必要）"
          : result.skipReason === "too_short"
          ? "この会話は文字数が少なく分析できません（200文字以上必要）"
          : result.skipReason === "single_speaker"
          ? "この会話は1人のみの発言で分析できません"
          : "分析に必要なデータが不足しています",
      sentimentId: savedSentiment?.id,
    });
  }
}

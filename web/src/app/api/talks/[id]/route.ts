import { createClient } from "@/lib/supabase/server";
import { generateTalkSummary } from "@/lib/gemini/client";
import { updateUsageAndNotify } from "@/lib/usage/client";
import { analyzeTalk, getTimeOfDay, type PreviousAnalysis } from "@/lib/sentiment";
import { NextResponse } from "next/server";
import type { TimeOfDay } from "@/types/database";
import { executeDiarization } from "./diarize/route";

// GET - Get single talk with messages
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

  // Get talk
  const { data: talk, error: talkError } = await supabase
    .from("talks")
    .select("*")
    .eq("id", id)
    .single();

  if (talkError) {
    return NextResponse.json({ error: "Talk not found" }, { status: 404 });
  }

  // Verify access (owner or partnership member)
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

  // Get messages
  const { data: messages } = await supabase
    .from("talk_messages")
    .select("*")
    .eq("talk_id", id)
    .order("timestamp", { ascending: true });

  return NextResponse.json({ talk, messages: messages || [] });
}

// PATCH - Update talk (pause, resume, end)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  // Get current talk
  const { data: talk, error: talkError } = await supabase
    .from("talks")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .single();

  if (talkError || !talk) {
    return NextResponse.json({ error: "Talk not found" }, { status: 404 });
  }

  let updateData: Record<string, unknown> = {};

  switch (action) {
    case "pause":
      if (talk.status !== "active" || talk.is_paused) {
        return NextResponse.json({ error: "Cannot pause" }, { status: 400 });
      }
      updateData = {
        status: "paused",
        is_paused: true,
        paused_at: new Date().toISOString(),
      };
      break;

    case "resume":
      if (talk.status !== "paused" || !talk.is_paused) {
        return NextResponse.json({ error: "Cannot resume" }, { status: 400 });
      }
      const pauseDuration = talk.paused_at
        ? Math.floor((Date.now() - new Date(talk.paused_at).getTime()) / 1000)
        : 0;
      updateData = {
        status: "active",
        is_paused: false,
        paused_at: null,
        total_pause_seconds: (talk.total_pause_seconds || 0) + pauseDuration,
      };
      break;

    case "end":
      if (talk.status !== "active" && talk.status !== "paused") {
        return NextResponse.json({ error: "Talk not active" }, { status: 400 });
      }
      const startTime = new Date(talk.started_at).getTime();
      const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
      const durationMinutes = Math.ceil((totalSeconds - (talk.total_pause_seconds || 0)) / 60);

      updateData = {
        status: "completed",
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        is_paused: false,
        paused_at: null,
        summary_status: "pending",
      };

      // 使用量を更新（警告メールの送信も含む）
      updateUsageAndNotify(supabase, user.id, durationMinutes).catch((err) => {
        console.error("[Talk End] Usage update failed:", err);
      });

      // 話者識別を非同期で実行（完了後にサマリー生成）
      triggerDiarizationAndSummary(id, talk, supabase).catch((err) => {
        console.error("[Talk End] Diarization and summary failed:", err);
      });
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: updatedTalk, error } = await supabase
    .from("talks")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating talk:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ talk: updatedTalk });
}

// DELETE - Delete talk
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete messages first
  await supabase
    .from("talk_messages")
    .delete()
    .eq("talk_id", id);

  // Delete talk
  const { error } = await supabase
    .from("talks")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);

  if (error) {
    console.error("Error deleting talk:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * 話者識別を実行してからサマリー生成を実行
 */
async function triggerDiarizationAndSummary(
  talkId: string,
  talk: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    console.log("[Diarization] Starting diarization for talk:", talkId);

    // 話者識別を実行
    const diarizeResult = await executeDiarization(talkId, supabase);
    console.log("[Diarization] Completed:", diarizeResult);

    // 話者識別完了後にサマリー生成
    await generateSummaryAsync(talkId, talk, supabase);
  } catch (error) {
    console.error("[Diarization] Unexpected error:", error);
    // エラーの場合でもサマリー生成は続行（話者タグなしで）
    await generateSummaryAsync(talkId, talk, supabase);
  }
}

/**
 * サマリー生成を非同期で実行
 */
async function generateSummaryAsync(
  talkId: string,
  talk: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    console.log("[Summary] Starting async generation for talk:", talkId);

    // メッセージを取得
    const { data: messages, error: messagesError } = await supabase
      .from("talk_messages")
      .select("speaker_tag, original_text")
      .eq("talk_id", talkId)
      .eq("is_final", true)
      .order("timestamp", { ascending: true });

    if (messagesError) {
      console.error("[Summary] Error fetching messages:", messagesError);
      await supabase
        .from("talks")
        .update({ summary_status: "failed" })
        .eq("id", talkId);
      return;
    }

    if (!messages || messages.length === 0) {
      console.log("[Summary] No messages to summarize");
      await supabase
        .from("talks")
        .update({ summary_status: "skipped", summary: "会話内容がありません。" })
        .eq("id", talkId);
      return;
    }

    // 話者名を追加
    const messagesWithNames = messages.map((m) => ({
      ...m,
      speaker_name:
        m.speaker_tag === 1
          ? (talk.speaker1_name as string)
          : (talk.speaker2_name as string),
    }));

    console.log("[Summary] Generating summary for", messagesWithNames.length, "messages");

    // サマリー生成
    const summaryResult = await generateTalkSummary(messagesWithNames);

    console.log("[Summary] Generated:", summaryResult.summary.substring(0, 100));

    // トークを更新
    const { error: updateError } = await supabase
      .from("talks")
      .update({
        summary: summaryResult.summary,
        promises: summaryResult.promises,
        next_topics: summaryResult.nextTopics,
        summary_status: "generated",
      })
      .eq("id", talkId);

    if (updateError) {
      console.error("[Summary] Error updating talk:", updateError);
      await supabase
        .from("talks")
        .update({ summary_status: "failed" })
        .eq("id", talkId);
      return;
    }

    // 約束をpromisesテーブルにも保存
    if (summaryResult.promises.length > 0 && talk.partnership_id) {
      const promisesToInsert = summaryResult.promises.map((p) => ({
        owner_user_id: talk.owner_user_id,
        partnership_id: talk.partnership_id,
        talk_id: talkId,
        content: p.content,
        is_completed: false,
        is_manual: false,
      }));

      const { error: promisesError } = await supabase
        .from("promises")
        .insert(promisesToInsert);

      if (promisesError) {
        console.error("[Summary] Error inserting promises:", promisesError);
      }
    }

    console.log("[Summary] Completed successfully for talk:", talkId);

    // サマリー生成後に感情分析を実行
    await analyzeSentimentAsync(talkId, talk, messagesWithNames, supabase);
  } catch (error) {
    console.error("[Summary] Unexpected error:", error);
    await supabase
      .from("talks")
      .update({ summary_status: "failed" })
      .eq("id", talkId);
  }
}

/**
 * 感情分析を非同期で実行
 */
async function analyzeSentimentAsync(
  talkId: string,
  talk: Record<string, unknown>,
  messages: Array<{ speaker_tag: number; original_text: string; speaker_name?: string }>,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    console.log("[Sentiment] Starting async analysis for talk:", talkId);

    // 過去3回分の分析結果を取得
    let previousAnalyses: PreviousAnalysis[] = [];
    if (talk.partnership_id) {
      const { data: previousSentiments } = await supabase
        .from("talk_sentiments")
        .select("*, talks(started_at)")
        .eq("partnership_id", talk.partnership_id)
        .eq("status", "completed")
        .neq("talk_id", talkId)
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

    // 分析用のメッセージを作成
    const analysisMessages = messages.map((m) => ({
      text: m.original_text,
      speakerTag: m.speaker_tag,
      speakerName: m.speaker_name,
    }));

    const talkStartedAt = new Date(talk.started_at as string);

    // 分析を実行
    const result = await analyzeTalk(
      analysisMessages,
      "ja", // TODO: ユーザーの言語設定を使用
      previousAnalyses,
      {
        datetime: talk.started_at as string,
        timeOfDay: getTimeOfDay(talkStartedAt),
        duration: (talk.duration_minutes as number) || 0,
        user1Name: (talk.speaker1_name as string) || "話者1",
        user2Name: (talk.speaker2_name as string) || "話者2",
      }
    );

    // 結果を保存
    const sentimentData = {
      talk_id: talkId,
      partnership_id: talk.partnership_id,
      status: result.status,
      skip_reason: result.skipReason,
      analyzed_at: new Date().toISOString(),
      analysis_language: "ja",
      analysis_version: "v1",
      talk_duration_minutes: talk.duration_minutes,
      talk_time_of_day: getTimeOfDay(talkStartedAt) as TimeOfDay,
      talk_day_of_week: talkStartedAt.getDay(),
      ...(result.status === "completed" && result.sentiment && result.evaluation
        ? {
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
            ai_insights: result.evaluation.insights,
          }
        : {}),
    };

    const { error } = await supabase
      .from("talk_sentiments")
      .insert(sentimentData);

    if (error) {
      console.error("[Sentiment] Error saving analysis:", error);
    } else {
      console.log("[Sentiment] Completed successfully for talk:", talkId, "Status:", result.status);
    }
  } catch (error) {
    console.error("[Sentiment] Unexpected error:", error);
  }
}

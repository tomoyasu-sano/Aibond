/**
 * 話者識別確認API
 *
 * POST /api/talks/:id/confirm
 * ユーザーが話者識別を確認後、サマリー生成を開始
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateIntegratedSummary } from "@/lib/gemini/client";
import { analyzeTalk, getTimeOfDay, type PreviousAnalysis } from "@/lib/sentiment";
import { NextRequest, NextResponse } from "next/server";
import type { TimeOfDay } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5分

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: talkId } = await params;
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Talk取得
  const { data: talk, error: talkError } = await supabase
    .from("talks")
    .select("*")
    .eq("id", talkId)
    .single();

  if (talkError || !talk) {
    return NextResponse.json({ error: "Talk not found" }, { status: 404 });
  }

  // アクセス権チェック
  if (talk.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 話者識別確認待ちステータスかチェック
  if (talk.summary_status !== "waiting_confirmation") {
    return NextResponse.json(
      { error: "Talk is not waiting for confirmation" },
      { status: 400 }
    );
  }

  // サマリー生成開始
  await supabase
    .from("talks")
    .update({ summary_status: "generating" })
    .eq("id", talkId);

  // サマリー生成を非同期で実行
  generateSummaryAndSentiment(talkId, talk, supabase).catch((err) => {
    console.error("[Confirm] Summary generation failed:", err);
  });

  return NextResponse.json({
    success: true,
    message: "Summary generation started",
  });
}

/**
 * サマリー生成と感情分析を実行（統合関数使用）
 */
async function generateSummaryAndSentiment(
  talkId: string,
  talk: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  // 非同期処理でRLSバイパス用にadminクライアントを使用
  const adminClient = createAdminClient();

  try {
    console.log("[Confirm] Starting integrated summary generation for talk:", talkId);

    // メッセージを取得
    const { data: messages, error: messagesError } = await supabase
      .from("talk_messages")
      .select("speaker_tag, original_text")
      .eq("talk_id", talkId)
      .eq("is_final", true)
      .order("timestamp", { ascending: true });

    if (messagesError) {
      console.error("[Confirm] Error fetching messages:", messagesError);
      await adminClient
        .from("talks")
        .update({ summary_status: "failed" })
        .eq("id", talkId);
      return;
    }

    if (!messages || messages.length === 0) {
      console.log("[Confirm] No messages to summarize");
      await adminClient
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

    console.log("[Confirm] Generating integrated summary for", messagesWithNames.length, "messages");

    // 絆ノート用のコンテキストを取得（partnership_idがある場合）
    let existingTopics: Array<{ id: string; title: string }> = [];
    let recentItems: Array<{
      topic_title: string;
      type: string;
      assignee: string | null;
      review_period: string | null;
      content: string;
    }> = [];
    let existingManualItems: Array<{
      question: string;
      answer: string;
      category: string;
    }> = [];

    if (talk.partnership_id) {
      // パートナーシップの history_deleted_at を取得
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("history_deleted_at")
        .eq("id", talk.partnership_id)
        .single();

      const historyDeletedAt = partnership?.history_deleted_at;

      // 既存の継続中のテーマと項目を取得（history_deleted_at 以降に作成されたもののみ）
      let topicsQuery = supabase
        .from("kizuna_topics")
        .select(`
          id,
          title,
          kizuna_items (
            content,
            type,
            assignee,
            status
          )
        `)
        .eq("partnership_id", talk.partnership_id)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (historyDeletedAt) {
        topicsQuery = topicsQuery.gt("created_at", historyDeletedAt);
      }

      const { data: topics } = await topicsQuery;

      // テーマごとに項目を整形（アクティブな項目のみ、最大5件）
      existingTopics = (topics || []).map((topic: any) => {
        const activeItems = (topic.kizuna_items || [])
          .filter((item: any) => item.status === "active")
          .slice(0, 5);

        return {
          id: topic.id,
          title: topic.title,
          items: activeItems.map((item: any) => ({
            content: item.content,
            type: item.type,
            assignee: item.assignee,
          })),
          itemCount: activeItems.length,
        };
      });

      // 過去の絆ノート項目を取得（学習用、history_deleted_at 以降に作成されたもののみ）
      let itemsQuery = supabase
        .from("kizuna_items")
        .select(`
          type,
          assignee,
          review_period,
          content,
          created_at,
          kizuna_topics!inner(title, created_at)
        `)
        .eq("kizuna_topics.partnership_id", talk.partnership_id)
        .is("kizuna_topics.deleted_at", null)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (historyDeletedAt) {
        itemsQuery = itemsQuery.gt("created_at", historyDeletedAt);
      }

      const { data: items } = await itemsQuery;

      recentItems = (items || []).map((item: any) => ({
        topic_title: item.kizuna_topics.title,
        type: item.type,
        assignee: item.assignee,
        review_period: item.review_period,
        content: item.content,
      }));
    }

    // 既存の取説項目を取得（重複チェック用）
    const { data: manualItems } = await supabase
      .from("manual_items")
      .select("question, answer, category")
      .eq("user_id", talk.owner_user_id as string)
      .order("updated_at", { ascending: false })
      .limit(50);

    existingManualItems = (manualItems || []).map((item) => ({
      question: item.question,
      answer: item.answer || "",
      category: item.category,
    }));

    // 統合サマリー生成（サマリー＋絆ノート項目を1回のリクエストで取得）
    const summaryResult = await generateIntegratedSummary(
      messagesWithNames,
      existingTopics,
      recentItems,
      existingManualItems
    );

    console.log("[Confirm] Generated:", summaryResult.summary.substring(0, 100));
    console.log("[Confirm] Bond note items:", summaryResult.bondNoteItems.length);
    console.log("[Confirm] Manual items:", summaryResult.manualItems.length);

    // トークを更新（絆ノート項目・取説項目も保存）
    const updateData: Record<string, unknown> = {
      summary: summaryResult.summary,
      next_topics: summaryResult.nextTopics,
      summary_status: "generated",
    };

    // 絆ノート項目があれば pending_bond_notes に保存
    if (summaryResult.bondNoteItems.length > 0 && talk.partnership_id) {
      updateData.pending_bond_notes = summaryResult.bondNoteItems;
    }

    // 取説項目があれば pending_manual_items に保存
    if (summaryResult.manualItems.length > 0) {
      updateData.pending_manual_items = summaryResult.manualItems;
    }

    const { error: updateError } = await adminClient
      .from("talks")
      .update(updateData)
      .eq("id", talkId);

    if (updateError) {
      console.error("[Confirm] Error updating talk:", updateError);
      await adminClient
        .from("talks")
        .update({ summary_status: "failed" })
        .eq("id", talkId);
      return;
    }

    console.log("[Confirm] Summary completed successfully for talk:", talkId);

    // 感情分析を実行
    await analyzeSentimentForTalk(talkId, talk, messagesWithNames, adminClient);
  } catch (error) {
    console.error("[Confirm] Unexpected error:", error);
    await adminClient
      .from("talks")
      .update({ summary_status: "failed" })
      .eq("id", talkId);
  }
}

/**
 * 感情分析を実行
 */
async function analyzeSentimentForTalk(
  talkId: string,
  talk: Record<string, unknown>,
  messages: Array<{ speaker_tag: number; original_text: string; speaker_name?: string }>,
  adminClient: ReturnType<typeof createAdminClient>
) {
  try {
    console.log("[Confirm] Starting sentiment analysis for talk:", talkId);

    // 過去3回分の分析結果を取得
    let previousAnalyses: PreviousAnalysis[] = [];
    if (talk.partnership_id) {
      const { data: previousSentiments } = await adminClient
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
      "ja",
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
            overall_score: result.overallScore,
            ai_insights: result.evaluation.insights,
          }
        : {}),
    };

    const { error } = await adminClient
      .from("talk_sentiments")
      .insert(sentimentData);

    if (error) {
      console.error("[Confirm] Error saving sentiment analysis:", error);
    } else {
      console.log("[Confirm] Sentiment analysis completed for talk:", talkId, "Status:", result.status);
    }
  } catch (error) {
    console.error("[Confirm] Sentiment analysis error:", error);
  }
}

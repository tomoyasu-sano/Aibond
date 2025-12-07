/**
 * サマリー生成API
 *
 * POST /api/summary/generate
 * トークの会話内容からサマリーを生成し、DBに保存
 */

import { createClient } from "@/lib/supabase/server";
import { generateIntegratedSummary } from "@/lib/gemini/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { talkId } = body;

    if (!talkId) {
      return NextResponse.json(
        { error: "talkId is required" },
        { status: 400 }
      );
    }

    console.log("[Summary] Generating summary for talk:", talkId);

    // トークを取得
    const { data: talk, error: talkError } = await supabase
      .from("talks")
      .select("*, partnership_id, owner_user_id, speaker1_name, speaker2_name")
      .eq("id", talkId)
      .single();

    if (talkError || !talk) {
      return NextResponse.json({ error: "Talk not found" }, { status: 404 });
    }

    // アクセス権限チェック
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

    // メッセージを取得
    const { data: messages, error: messagesError } = await supabase
      .from("talk_messages")
      .select("speaker_tag, original_text")
      .eq("talk_id", talkId)
      .eq("is_final", true)
      .order("timestamp", { ascending: true });

    if (messagesError) {
      console.error("[Summary] Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // 話者名を追加
    const messagesWithNames = (messages || []).map((m) => ({
      ...m,
      speaker_name:
        m.speaker_tag === 1 ? talk.speaker1_name : talk.speaker2_name,
    }));

    console.log("[Summary] Messages count:", messagesWithNames.length);

    // 既存の継続中のテーマを取得（パートナーシップがある場合）
    let existingTopics: { id: string; title: string }[] = [];
    let formattedRecentItems: any[] = [];
    let existingManualItems: { question: string; answer: string; category: string }[] = [];

    if (talk.partnership_id) {
      const { data: topics } = await supabase
        .from("kizuna_topics")
        .select("id, title")
        .eq("partnership_id", talk.partnership_id)
        .eq("status", "active")
        .order("updated_at", { ascending: false });
      existingTopics = topics || [];

      // 過去の絆ノート項目を取得（学習用）
      const { data: recentItems } = await supabase
        .from("kizuna_items")
        .select(`
          type,
          assignee,
          review_period,
          content,
          kizuna_topics!inner(title)
        `)
        .eq("kizuna_topics.partnership_id", talk.partnership_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(30);

      formattedRecentItems = recentItems?.map((item: any) => ({
        topic_title: item.kizuna_topics.title,
        type: item.type,
        assignee: item.assignee,
        review_period: item.review_period,
        content: item.content,
      })) || [];
    }

    // 既存の取説項目を取得（重複チェック用）
    const { data: manualItems } = await supabase
      .from("manual_items")
      .select("question, answer, category")
      .eq("user_id", talk.owner_user_id)
      .order("updated_at", { ascending: false })
      .limit(50);

    existingManualItems = (manualItems || []).map((item) => ({
      question: item.question,
      answer: item.answer || "",
      category: item.category,
    }));

    // 統合サマリー生成（サマリー + 絆ノート + 取説を一度に生成）
    const result = await generateIntegratedSummary(
      messagesWithNames,
      existingTopics,
      formattedRecentItems,
      existingManualItems
    );

    console.log("[Summary] Generated summary:", result.summary.substring(0, 100));
    console.log("[Summary] Generated bond note items:", result.bondNoteItems.length);
    console.log("[Summary] Generated manual items:", result.manualItems.length);

    // パートナーシップがない場合は絆ノートをクリア
    const pendingBondNotes = talk.partnership_id && result.bondNoteItems.length > 0
      ? result.bondNoteItems
      : null;

    // 取説項目がある場合のみ保存
    const pendingManualItems = result.manualItems.length > 0
      ? result.manualItems
      : null;

    // トークを更新（pending_bond_notes と pending_manual_items も保存）
    const { error: updateError } = await supabase
      .from("talks")
      .update({
        summary: result.summary,
        next_topics: result.nextTopics,
        summary_status: "generated",
        pending_bond_notes: pendingBondNotes,
        pending_manual_items: pendingManualItems,
      })
      .eq("id", talkId);

    if (updateError) {
      console.error("[Summary] Error updating talk:", updateError);
      return NextResponse.json(
        { error: "Failed to save summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      summary: result.summary,
      nextTopics: result.nextTopics,
      bondNoteItems: result.bondNoteItems,
      manualItems: result.manualItems,
      partnershipId: talk.partnership_id,
    });
  } catch (error) {
    console.error("[Summary] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * データエクスポートAPI
 *
 * GET /api/export - ユーザーデータをJSON形式でエクスポート
 *
 * 有料プラン（standard/premium）のみ利用可能
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 有料プランかどうかをチェック
async function isPaidUser(supabase: any, userId: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .single();

  const plan = subscription?.plan || "free";
  return plan !== "free"; // standard または premium は有料
}

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 有料プランチェック
  const isPaid = await isPaidUser(supabase, user.id);
  if (!isPaid) {
    return NextResponse.json(
      { error: "この機能は有料プランのみ利用可能です" },
      { status: 403 }
    );
  }

  try {
    // パートナーシップを取得（activeなもの）
    // Note: 再連携時にhistory_deleted_atがnullに戻るはずだが、
    // 念のため条件から除外して、statusのみで判定する
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("id, user1_id, user2_id, partnership_name, created_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "active")
      .single();

    const partnerId = partnership
      ? (partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id)
      : null;

    // ユーザープロフィール取得
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name, language")
      .eq("id", user.id)
      .single();

    // パートナープロフィール取得
    let partnerProfile = null;
    if (partnerId) {
      const { data } = await supabase
        .from("user_profiles")
        .select("display_name, language")
        .eq("id", partnerId)
        .single();
      partnerProfile = data;
    }

    // 話し合い履歴を取得（/api/talksと同じロジックを使用）
    // partnership_idがNULLのものも含めて、owner_user_idで取得
    const { data: allTalks, error: talksError } = await supabase
      .from("talks")
      .select(`
        id,
        started_at,
        ended_at,
        duration_minutes,
        summary,
        speaker1_name,
        speaker2_name,
        deleted_at,
        partnership_id,
        talk_messages (
          id,
          speaker_tag,
          original_text,
          original_language,
          translated_text,
          timestamp
        )
      `)
      .or(
        partnership
          ? `owner_user_id.eq.${user.id},partnership_id.eq.${partnership.id}`
          : `owner_user_id.eq.${user.id}`
      )
      .order("started_at", { ascending: false });

    console.log("[Export] User ID:", user.id);
    console.log("[Export] Partnership:", JSON.stringify(partnership, null, 2));
    console.log("[Export] Talks query error:", JSON.stringify(talksError, null, 2));
    console.log("[Export] Talks data count:", allTalks?.length || 0);
    if (allTalks && allTalks.length > 0) {
      console.log("[Export] First talk sample:", JSON.stringify(allTalks[0], null, 2));
    } else {
      console.log("[Export] No talks found. Checking all talks for this user...");
      // デバッグ用: owner_user_idのみで検索
      const { data: debugTalks, error: debugError } = await supabase
        .from("talks")
        .select("id, owner_user_id, partnership_id, deleted_at, started_at")
        .eq("owner_user_id", user.id);
      console.log("[Export] Debug - All talks by owner_user_id:", JSON.stringify(debugTalks, null, 2));
      console.log("[Export] Debug error:", JSON.stringify(debugError, null, 2));
    }

    const talks = allTalks || [];

    // 絆ノートを取得（パートナーシップの有無に関わらず、ユーザーが作成したもの全て）
    // deleted_atも含める
    const { data: kizunaTopics } = await supabase
      .from("kizuna_topics")
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        resolved_at,
        deleted_at,
        kizuna_items (
          id,
          type,
          content,
          assignee,
          status,
          review_date,
          created_at,
          kizuna_feedbacks (
            id,
            rating,
            comment,
            created_at
          ),
          kizuna_reviews (
            id,
            result,
            note,
            created_at
          )
        )
      `)
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false });

    // 取説を取得（削除済みデータも含める）
    const { data: manualItems } = await supabase
      .from("manual_items")
      .select(`
        id,
        user_id,
        target_user_id,
        category,
        question,
        answer,
        date,
        is_fixed,
        created_at,
        updated_at,
        deleted_at
      `)
      .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    // AI相談履歴を取得（削除済みデータも含める）
    const { data: aiConsultations } = await supabase
      .from("ai_consultations")
      .select(`
        id,
        topic,
        created_at,
        updated_at,
        deleted_at,
        ai_messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // エクスポートデータを構築
    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        display_name: profile?.display_name || null,
        language: profile?.language || "ja",
        email: user.email,
      },
      partner: partnerProfile ? {
        display_name: partnerProfile.display_name || null,
        language: partnerProfile.language || "ja",
      } : null,
      partnership: partnership ? {
        name: partnership.partnership_name,
        created_at: partnership.created_at,
      } : null,
      talks: talks.map(talk => ({
        id: talk.id,
        started_at: talk.started_at,
        ended_at: talk.ended_at,
        duration_minutes: talk.duration_minutes,
        summary: talk.summary,
        speaker1_name: talk.speaker1_name,
        speaker2_name: talk.speaker2_name,
        deleted_at: talk.deleted_at,
        messages: (talk.talk_messages || []).map((msg: any) => ({
          speaker_tag: msg.speaker_tag,
          original_text: msg.original_text,
          original_language: msg.original_language,
          translated_text: msg.translated_text,
          timestamp: msg.timestamp,
        })),
      })),
      kizuna_notes: (kizunaTopics || []).map(topic => ({
        id: topic.id,
        title: topic.title,
        status: topic.status,
        created_at: topic.created_at,
        updated_at: topic.updated_at,
        resolved_at: topic.resolved_at,
        deleted_at: topic.deleted_at,
        items: (topic.kizuna_items || []).map((item: any) => ({
          id: item.id,
          type: item.type,
          content: item.content,
          assignee: item.assignee,
          status: item.status,
          review_date: item.review_date,
          created_at: item.created_at,
          feedbacks: item.kizuna_feedbacks || [],
          reviews: item.kizuna_reviews || [],
        })),
      })),
      manual_items: (manualItems || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        target_user_id: item.target_user_id,
        category: item.category,
        question: item.question,
        answer: item.answer,
        date: item.date,
        is_fixed: item.is_fixed,
        created_at: item.created_at,
        updated_at: item.updated_at,
        deleted_at: item.deleted_at,
      })),
      ai_consultations: (aiConsultations || []).map(consultation => ({
        id: consultation.id,
        topic: consultation.topic,
        created_at: consultation.created_at,
        updated_at: consultation.updated_at,
        deleted_at: consultation.deleted_at,
        messages: (consultation.ai_messages || []).map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
        })),
      })),
    };

    // JSONレスポンスを返す（ダウンロード用ヘッダー付き）
    const fileName = `aibond-export-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[Export] Error:", error);
    return NextResponse.json(
      { error: "エクスポートに失敗しました" },
      { status: 500 }
    );
  }
}

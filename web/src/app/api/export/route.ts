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
    // パートナーシップを取得（履歴削除されていないもの）
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("id, user1_id, user2_id, partnership_name, created_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "active")
      .is("history_deleted_at", null)
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

    // 話し合い履歴を取得
    let talks: any[] = [];
    if (partnership) {
      const { data } = await supabase
        .from("talks")
        .select(`
          id,
          started_at,
          ended_at,
          duration,
          summary,
          speaker1_name,
          speaker2_name,
          sentiment_messages (
            id,
            speaker,
            content,
            sentiment_score,
            timestamp_seconds
          )
        `)
        .eq("partnership_id", partnership.id)
        .is("deleted_at", null)
        .order("started_at", { ascending: false });

      talks = data || [];
    }

    // 絆ノートを取得
    let kizunaTopics: any[] = [];

    // パートナーシップありの場合
    if (partnership) {
      const { data } = await supabase
        .from("kizuna_topics")
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          resolved_at,
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
        .eq("partnership_id", partnership.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      kizunaTopics = data || [];
    }

    // パートナーシップなしで作成したものも取得
    const { data: soloKizuna } = await supabase
      .from("kizuna_topics")
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        resolved_at,
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
      .is("partnership_id", null)
      .eq("created_by", user.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (soloKizuna) {
      kizunaTopics = [...kizunaTopics, ...soloKizuna];
    }

    // 取説を取得
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
        updated_at
      `)
      .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // AI相談履歴を取得
    const { data: aiConsultations } = await supabase
      .from("ai_consultations")
      .select(`
        id,
        topic,
        created_at,
        updated_at,
        ai_messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .is("deleted_at", null)
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
        duration: talk.duration,
        summary: talk.summary,
        speaker1_name: talk.speaker1_name,
        speaker2_name: talk.speaker2_name,
        messages: (talk.sentiment_messages || []).map((msg: any) => ({
          speaker: msg.speaker,
          content: msg.content,
          sentiment_score: msg.sentiment_score,
          timestamp_seconds: msg.timestamp_seconds,
        })),
      })),
      kizuna_notes: kizunaTopics.map(topic => ({
        id: topic.id,
        title: topic.title,
        status: topic.status,
        created_at: topic.created_at,
        updated_at: topic.updated_at,
        resolved_at: topic.resolved_at,
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
      })),
      ai_consultations: (aiConsultations || []).map(consultation => ({
        id: consultation.id,
        topic: consultation.topic,
        created_at: consultation.created_at,
        updated_at: consultation.updated_at,
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

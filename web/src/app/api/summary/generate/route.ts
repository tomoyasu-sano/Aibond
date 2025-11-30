/**
 * サマリー生成API
 *
 * POST /api/summary/generate
 * トークの会話内容からサマリーを生成し、DBに保存
 */

import { createClient } from "@/lib/supabase/server";
import { generateTalkSummary } from "@/lib/gemini/client";
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
      return NextResponse.json(
        { error: "Failed to save summary" },
        { status: 500 }
      );
    }

    // 約束をpromisesテーブルにも保存
    if (summaryResult.promises.length > 0 && talk.partnership_id) {
      const promisesToInsert = summaryResult.promises.map((p) => ({
        owner_user_id: user.id,
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
        // 約束の保存に失敗してもサマリー生成は成功とする
      }
    }

    return NextResponse.json({
      summary: summaryResult.summary,
      promises: summaryResult.promises,
      nextTopics: summaryResult.nextTopics,
    });
  } catch (error) {
    console.error("[Summary] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

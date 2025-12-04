/**
 * Swap Speaker Tags API
 *
 * POST /api/talks/:id/swap-speakers
 * 会話内の全ての話者タグを入れ替える（1 ↔ 2）
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const talkId = params.id;

  console.log(`[Swap Speakers] Starting speaker swap for talk: ${talkId}`);

  try {
    // Talkの存在確認とアクセス権チェック
    const { data: talk, error: talkError } = await supabase
      .from("talks")
      .select("*")
      .eq("id", talkId)
      .single();

    if (talkError || !talk) {
      console.error("[Swap Speakers] Talk not found:", talkError);
      return NextResponse.json({ error: "Talk not found" }, { status: 404 });
    }

    // アクセス権チェック（オーナーまたはパートナーシップメンバー）
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

    // 全メッセージを取得
    const { data: messages, error: messagesError } = await supabase
      .from("talk_messages")
      .select("id, speaker_tag")
      .eq("talk_id", talkId)
      .not("speaker_tag", "is", null);

    if (messagesError) {
      console.error("[Swap Speakers] Failed to fetch messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      console.log("[Swap Speakers] No messages with speaker tags found");
      return NextResponse.json({
        success: true,
        swappedCount: 0,
        message: "No messages to swap",
      });
    }

    console.log(`[Swap Speakers] Found ${messages.length} messages to swap`);

    // 各メッセージの話者タグを入れ替え
    let swappedCount = 0;
    for (const message of messages) {
      const newSpeakerTag = message.speaker_tag === 1 ? 2 : 1;

      const { error: updateError } = await supabase
        .from("talk_messages")
        .update({ speaker_tag: newSpeakerTag })
        .eq("id", message.id);

      if (updateError) {
        console.error(
          `[Swap Speakers] Failed to update message ${message.id}:`,
          updateError
        );
      } else {
        swappedCount++;
      }
    }

    console.log(
      `[Swap Speakers] Successfully swapped ${swappedCount}/${messages.length} messages`
    );

    return NextResponse.json({
      success: true,
      swappedCount,
      totalMessages: messages.length,
    });
  } catch (error) {
    console.error("[Swap Speakers] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

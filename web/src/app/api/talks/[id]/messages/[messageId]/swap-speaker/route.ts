/**
 * 個別メッセージの話者設定API
 * POST /api/talks/:id/messages/:messageId/swap-speaker
 *
 * リクエストボディ:
 * - speaker_tag: 1（話者1）, 2（話者2）, null（不明）
 * - speaker_tag が指定されていない場合は従来通りswap（1↔2）
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; messageId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id: talkId, messageId } = await context.params;
  const supabase = await createClient();

  // リクエストボディを取得（空の場合もあり得る）
  let body: { speaker_tag?: number | null } = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch (e) {
    // JSONパースエラーは無視（空のbodyとして扱う）
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get talk to verify access
  const { data: talk, error: talkError } = await supabase
    .from("talks")
    .select("id, owner_user_id, partnership_id")
    .eq("id", talkId)
    .single();

  if (talkError || !talk) {
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

  // Get the message
  const { data: message, error: messageError } = await supabase
    .from("talk_messages")
    .select("id, speaker_tag")
    .eq("id", messageId)
    .eq("talk_id", talkId)
    .single();

  if (messageError || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // 新しいspeaker_tagを決定
  let newSpeakerTag: number | null;
  if ("speaker_tag" in body) {
    // リクエストボディにspeaker_tagが指定されている場合はそれを使用
    // null, 1, 2 のいずれかを受け入れる
    if (body.speaker_tag === null || body.speaker_tag === 1 || body.speaker_tag === 2) {
      newSpeakerTag = body.speaker_tag;
    } else {
      return NextResponse.json({ error: "Invalid speaker_tag. Must be 1, 2, or null" }, { status: 400 });
    }
  } else {
    // 指定がない場合は従来通りswap（1↔2）、nullの場合は1にする
    newSpeakerTag = message.speaker_tag === 1 ? 2 : 1;
  }

  // adminClientを使用してRLSをバイパス（swap-speakersと同様）
  const adminClient = createAdminClient();

  const { error: updateError } = await adminClient
    .from("talk_messages")
    .update({ speaker_tag: newSpeakerTag })
    .eq("id", messageId)
    .eq("talk_id", talkId);

  if (updateError) {
    console.error("[Set Speaker] Error updating message:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[Set Speaker] Updated message ${messageId} to speaker_tag: ${newSpeakerTag}`);

  return NextResponse.json({ message: { id: messageId, speaker_tag: newSpeakerTag } });
}

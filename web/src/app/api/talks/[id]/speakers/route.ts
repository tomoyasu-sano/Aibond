/**
 * 話者マッピングAPI
 *
 * PATCH /api/talks/[id]/speakers
 * トークの話者を設定・更新
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const { speaker1_user_id, speaker2_user_id, speaker1_name, speaker2_name } =
      body;

    // トークを取得
    const { data: talk, error: talkError } = await supabase
      .from("talks")
      .select("*, partnership_id, owner_user_id")
      .eq("id", id)
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

    // 更新データを準備
    const updateData: Record<string, unknown> = {};

    if (speaker1_user_id !== undefined) {
      updateData.speaker1_user_id = speaker1_user_id;
    }
    if (speaker2_user_id !== undefined) {
      updateData.speaker2_user_id = speaker2_user_id;
    }
    if (speaker1_name !== undefined) {
      updateData.speaker1_name = speaker1_name;
    }
    if (speaker2_name !== undefined) {
      updateData.speaker2_name = speaker2_name;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No update data provided" },
        { status: 400 }
      );
    }

    // トークを更新
    const { data: updatedTalk, error: updateError } = await supabase
      .from("talks")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[Speakers] Error updating talk:", updateError);
      return NextResponse.json(
        { error: "Failed to update speakers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ talk: updatedTalk });
  } catch (error) {
    console.error("[Speakers] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/talks/[id]/speakers
 * 話者情報を取得（サンプル発言含む）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    // トークを取得
    const { data: talk, error: talkError } = await supabase
      .from("talks")
      .select(
        "*, partnership_id, owner_user_id, speaker1_user_id, speaker2_user_id, speaker1_name, speaker2_name"
      )
      .eq("id", id)
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

    // 各話者のサンプル発言を取得
    const { data: messages } = await supabase
      .from("talk_messages")
      .select("speaker_tag, original_text")
      .eq("talk_id", id)
      .eq("is_final", true)
      .order("timestamp", { ascending: true })
      .limit(20);

    // 話者ごとにグループ化してサンプルを取得
    const speaker1Samples: string[] = [];
    const speaker2Samples: string[] = [];

    messages?.forEach((m) => {
      if (m.speaker_tag === 1 && speaker1Samples.length < 3) {
        speaker1Samples.push(m.original_text);
      } else if (m.speaker_tag === 2 && speaker2Samples.length < 3) {
        speaker2Samples.push(m.original_text);
      }
    });

    // パートナー情報を取得
    let partnerInfo = null;
    if (talk.partnership_id) {
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("user1_id, user2_id")
        .eq("id", talk.partnership_id)
        .single();

      if (partnership) {
        const partnerId =
          partnership.user1_id === user.id
            ? partnership.user2_id
            : partnership.user1_id;

        const { data: partnerProfile } = await supabase
          .from("user_profiles")
          .select("id, display_name")
          .eq("id", partnerId)
          .single();

        const { data: userProfile } = await supabase
          .from("user_profiles")
          .select("id, display_name")
          .eq("id", user.id)
          .single();

        partnerInfo = {
          currentUser: {
            id: user.id,
            name: userProfile?.display_name || "自分",
          },
          partner: {
            id: partnerId,
            name: partnerProfile?.display_name || "パートナー",
          },
        };
      }
    }

    return NextResponse.json({
      speakers: {
        speaker1: {
          user_id: talk.speaker1_user_id,
          name: talk.speaker1_name,
          samples: speaker1Samples,
        },
        speaker2: {
          user_id: talk.speaker2_user_id,
          name: talk.speaker2_name,
          samples: speaker2Samples,
        },
      },
      partnerInfo,
    });
  } catch (error) {
    console.error("[Speakers] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

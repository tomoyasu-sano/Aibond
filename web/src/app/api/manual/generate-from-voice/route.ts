/**
 * 音声から取説項目を生成するAPI
 *
 * POST /api/manual/generate-from-voice
 */

import { createClient } from "@/lib/supabase/server";
import { generateManualItemsFromVoice } from "@/lib/gemini/client";
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
    const { transcript, targetUserId } = body;

    if (!transcript || !targetUserId) {
      return NextResponse.json(
        { error: "transcript and targetUserId are required" },
        { status: 400 }
      );
    }

    // アクセス権限チェック（自分の取説 or パートナーの取説）
    if (targetUserId !== user.id) {
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${targetUserId},user2_id.eq.${targetUserId}`)
        .eq("status", "active")
        .single();

      if (!partnership) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    console.log("[Manual Voice] Generating items from transcript:", transcript.substring(0, 100));

    // Gemini AIで項目を生成
    const result = await generateManualItemsFromVoice(transcript);

    console.log("[Manual Voice] Generated items:", result.items.length);

    return NextResponse.json({
      items: result.items,
    });
  } catch (error) {
    console.error("[Manual Voice] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

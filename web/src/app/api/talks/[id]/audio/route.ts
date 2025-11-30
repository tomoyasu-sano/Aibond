/**
 * Talk Audio API
 *
 * POST /api/talks/[id]/audio - 音声ファイルをアップロード
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: talkId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // トークの存在確認とアクセス権チェック
  const { data: talk, error: talkError } = await supabase
    .from("talks")
    .select(`
      id,
      status,
      duration_minutes,
      partnership:partnerships!inner(
        id,
        user1_id,
        user2_id
      )
    `)
    .eq("id", talkId)
    .single();

  if (talkError || !talk) {
    return NextResponse.json({ error: "Talk not found" }, { status: 404 });
  }

  // アクセス権チェック
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partnership = (talk.partnership as any)?.[0] || talk.partnership;
  if (!partnership || (partnership.user1_id !== user.id && partnership.user2_id !== user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const durationSeconds = formData.get("duration") as string;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // ファイルサイズチェック（500MB上限）
    const maxSize = 500 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // ファイルパス生成
    const filePath = `${talkId}.webm`;

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from("audio-files")
      .upload(filePath, audioFile, {
        contentType: "audio/webm",
        upsert: true, // 既存ファイルがあれば上書き
      });

    if (uploadError) {
      console.error("[Audio Upload] Storage error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload audio" },
        { status: 500 }
      );
    }

    // audio_filesテーブルに保存（既存レコードがあれば更新）
    const { error: dbError } = await supabase
      .from("audio_files")
      .upsert(
        {
          talk_id: talkId,
          file_path: filePath,
          file_size: audioFile.size,
          duration_seconds: durationSeconds ? parseInt(durationSeconds, 10) : null,
          format: "webm",
        },
        {
          onConflict: "talk_id",
        }
      );

    if (dbError) {
      console.error("[Audio Upload] DB error:", dbError);
      // ストレージにはアップロード済みなのでエラーを返すが、データは残る
      return NextResponse.json(
        { error: "Failed to save audio metadata" },
        { status: 500 }
      );
    }

    console.log("[Audio Upload] Success:", filePath, audioFile.size, "bytes");

    return NextResponse.json({
      success: true,
      filePath,
      fileSize: audioFile.size,
    });
  } catch (error) {
    console.error("[Audio Upload] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

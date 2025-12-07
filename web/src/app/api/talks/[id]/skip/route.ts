/**
 * 話者識別スキップAPI
 *
 * POST /api/talks/:id/skip
 * ユーザーが話者識別をスキップし、サマリー生成を行わない
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    .select("id, owner_user_id, summary_status")
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

  // summary_statusを"skipped"に更新
  const { error: updateError } = await supabase
    .from("talks")
    .update({ summary_status: "skipped" })
    .eq("id", talkId);

  if (updateError) {
    console.error("[Skip] Error updating talk:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[Skip] Talk ${talkId} summary skipped by user`);

  return NextResponse.json({ success: true, summary_status: "skipped" });
}

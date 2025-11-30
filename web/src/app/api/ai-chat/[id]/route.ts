/**
 * AI相談個別API
 *
 * DELETE /api/ai-chat/[id] - 相談削除
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// DELETE - 相談削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 相談を取得して所有者確認
  const { data: consultation, error: fetchError } = await supabase
    .from("ai_consultations")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  // 所有者チェック
  if (consultation.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 削除実行
  console.log("[AI Chat] Attempting to delete consultation:", id, "by user:", user.id);

  const { data: deleteData, error: deleteError } = await supabase
    .from("ai_consultations")
    .delete()
    .eq("id", id)
    .select();

  console.log("[AI Chat] Delete result:", { deleteData, deleteError });

  if (deleteError) {
    console.error("[AI Chat] Error deleting consultation:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 削除されたかどうかを確認
  if (!deleteData || deleteData.length === 0) {
    console.error("[AI Chat] No rows deleted - possible RLS issue");
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  console.log("[AI Chat] Successfully deleted consultation:", id);
  return NextResponse.json({ success: true });
}

/**
 * 約束個別API
 *
 * GET /api/promises/[id] - 約束詳細取得
 * PATCH /api/promises/[id] - 約束更新（完了状態、内容編集）
 * DELETE /api/promises/[id] - 約束削除
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - 約束詳細取得
export async function GET(
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

  const { data: promise, error } = await supabase
    .from("promises")
    .select("*, talks(started_at)")
    .eq("id", id)
    .single();

  if (error || !promise) {
    return NextResponse.json({ error: "Promise not found" }, { status: 404 });
  }

  // アクセス権限チェック
  if (promise.owner_user_id !== user.id) {
    if (promise.partnership_id) {
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("id")
        .eq("id", promise.partnership_id)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();

      if (!partnership) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  return NextResponse.json({ promise });
}

// PATCH - 約束更新
export async function PATCH(
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

  try {
    const body = await request.json();
    const { is_completed, content } = body;

    // 約束を取得
    const { data: promise, error: fetchError } = await supabase
      .from("promises")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !promise) {
      return NextResponse.json({ error: "Promise not found" }, { status: 404 });
    }

    // アクセス権限チェック
    if (promise.owner_user_id !== user.id) {
      if (promise.partnership_id) {
        const { data: partnership } = await supabase
          .from("partnerships")
          .select("id")
          .eq("id", promise.partnership_id)
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
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
      if (is_completed) {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }

    if (content !== undefined) {
      if (content.trim().length === 0) {
        return NextResponse.json(
          { error: "content cannot be empty" },
          { status: 400 }
        );
      }
      updateData.content = content.trim();
    }

    // 約束を更新
    const { data: updatedPromise, error: updateError } = await supabase
      .from("promises")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[Promises] Error updating:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ promise: updatedPromise });
  } catch (error) {
    console.error("[Promises] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - 約束削除
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

  // 約束を取得
  const { data: promise, error: fetchError } = await supabase
    .from("promises")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !promise) {
    return NextResponse.json({ error: "Promise not found" }, { status: 404 });
  }

  // アクセス権限チェック（オーナーのみ削除可能）
  if (promise.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 約束を削除
  const { error: deleteError } = await supabase
    .from("promises")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[Promises] Error deleting:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * 約束リストAPI
 *
 * GET /api/promises - 約束一覧取得
 * POST /api/promises - 約束を手動追加
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - 約束一覧取得
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // クエリパラメータ
  const searchParams = request.nextUrl.searchParams;
  const completed = searchParams.get("completed");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  // ユーザーのパートナーシップを取得
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  // クエリ構築
  let query = supabase
    .from("promises")
    .select("*, talks(started_at)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // 自分の約束 または パートナーシップの約束
  if (partnership) {
    query = query.or(
      `owner_user_id.eq.${user.id},partnership_id.eq.${partnership.id}`
    );
  } else {
    query = query.eq("owner_user_id", user.id);
  }

  // 完了状態でフィルタ
  if (completed === "true") {
    query = query.eq("is_completed", true);
  } else if (completed === "false") {
    query = query.eq("is_completed", false);
  }

  const { data: promises, error, count } = await query;

  if (error) {
    console.error("[Promises] Error fetching:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    promises: promises || [],
    total: count || 0,
  });
}

// POST - 約束を手動追加
export async function POST(request: NextRequest) {
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
    const { content, talk_id } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // ユーザーのパートナーシップを取得
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "active")
      .single();

    // 約束を作成
    const { data: promise, error } = await supabase
      .from("promises")
      .insert({
        owner_user_id: user.id,
        partnership_id: partnership?.id || null,
        talk_id: talk_id || null,
        content: content.trim(),
        is_completed: false,
        is_manual: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[Promises] Error creating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ promise }, { status: 201 });
  } catch (error) {
    console.error("[Promises] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 取説項目の一括作成API
 *
 * POST /api/manual/items/bulk-create
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface BulkCreateItem {
  category: string;
  question: string;
  answer: string;
  date?: string;
}

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
    const { target_user_id, items } = body as {
      target_user_id: string;
      items: BulkCreateItem[];
    };

    if (!target_user_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "target_user_id and items are required" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "items array cannot be empty" },
        { status: 400 }
      );
    }

    // 最大20件まで
    if (items.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 items allowed" },
        { status: 400 }
      );
    }

    // アクセス権限チェック（自分の取説 or パートナーの取説）
    let partnershipId = null;
    if (target_user_id !== user.id) {
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${target_user_id},user2_id.eq.${target_user_id}`)
        .eq("status", "active")
        .single();

      if (!partnership) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
      partnershipId = partnership.id;
    }

    console.log(`[Manual Bulk Create] Creating ${items.length} items for user ${target_user_id}`);

    // 一括挿入用のデータを準備
    const insertData = items.map((item) => ({
      user_id: user.id,
      target_user_id,
      partnership_id: partnershipId,
      category: item.category,
      question: item.question,
      answer: item.answer || "",
      date: item.date || null,
      is_fixed: false,
    }));

    // 一括挿入
    const { data: createdItems, error: insertError } = await supabase
      .from("manual_items")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("[Manual Bulk Create] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create items" },
        { status: 500 }
      );
    }

    console.log(`[Manual Bulk Create] Successfully created ${createdItems?.length || 0} items`);

    return NextResponse.json({
      items: createdItems,
      count: createdItems?.length || 0,
    });
  } catch (error) {
    console.error("[Manual Bulk Create] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

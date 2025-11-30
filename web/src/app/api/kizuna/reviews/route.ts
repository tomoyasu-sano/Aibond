/**
 * 絆ノート - レビューAPI
 *
 * POST /api/kizuna/reviews - レビュー追加
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - レビュー追加
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
    const { item_id, result, note, new_content, new_review_period } = body;

    // バリデーション
    if (!item_id) {
      return NextResponse.json({ error: "item_id is required" }, { status: 400 });
    }

    if (!result || !["completed", "continue", "modified", "abandoned"].includes(result)) {
      return NextResponse.json({ error: "Invalid result" }, { status: 400 });
    }

    // レビューを作成
    const { data: review, error: reviewError } = await supabase
      .from("kizuna_reviews")
      .insert({
        item_id,
        result,
        note: note?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (reviewError) {
      console.error("[Kizuna Reviews] Error creating:", reviewError);
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    // 結果に応じて項目を更新
    const itemUpdate: {
      status?: string;
      review_date?: string | null;
      review_period?: string | null;
    } = {};

    if (result === "completed") {
      itemUpdate.status = "completed";
      itemUpdate.review_date = null;
    } else if (result === "abandoned") {
      itemUpdate.status = "abandoned";
      itemUpdate.review_date = null;
    } else if (result === "continue" || result === "modified") {
      // 次のレビュー日を計算
      const period = new_review_period || "1month";
      const nextDate = new Date();
      switch (period) {
        case "1week":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "2weeks":
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case "1month":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "3months":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
      }
      itemUpdate.review_date = nextDate.toISOString().split("T")[0];
      itemUpdate.review_period = period;
      itemUpdate.status = "active";
    }

    // 修正の場合は新しい内容で更新
    if (result === "modified" && new_content) {
      await supabase
        .from("kizuna_items")
        .update({
          ...itemUpdate,
          content: new_content.trim(),
          status: "modified", // 一度modifiedにしてから
        })
        .eq("id", item_id);

      // 新しい項目として追加
      const { data: originalItem } = await supabase
        .from("kizuna_items")
        .select("topic_id, type, assignee")
        .eq("id", item_id)
        .single();

      if (originalItem) {
        const nextDate = new Date();
        const period = new_review_period || "1month";
        switch (period) {
          case "1week":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case "2weeks":
            nextDate.setDate(nextDate.getDate() + 14);
            break;
          case "1month":
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case "3months":
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        }

        await supabase.from("kizuna_items").insert({
          topic_id: originalItem.topic_id,
          type: originalItem.type,
          content: new_content.trim(),
          assignee: originalItem.assignee,
          review_date: nextDate.toISOString().split("T")[0],
          review_period: period,
          status: "active",
          created_by: user.id,
        });
      }
    } else {
      await supabase
        .from("kizuna_items")
        .update(itemUpdate)
        .eq("id", item_id);
    }

    // テーマのupdated_atを更新
    const { data: item } = await supabase
      .from("kizuna_items")
      .select("topic_id")
      .eq("id", item_id)
      .single();

    if (item) {
      await supabase
        .from("kizuna_topics")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", item.topic_id);
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("[Kizuna Reviews] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * 絆ノート - 見直し時期アラートAPI
 *
 * GET /api/kizuna/review-alerts - 見直し時期が近いアイテムを取得
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ユーザーのパートナーシップを取得
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  if (!partnership) {
    return NextResponse.json({ items: [], count: 0 });
  }

  const today = new Date();
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysLaterStr = sevenDaysLater.toISOString().split("T")[0];

  // 見直し時期が7日以内のアクティブなアイテムを取得
  const { data: items, error } = await supabase
    .from("kizuna_items")
    .select(
      `
      id,
      type,
      content,
      review_date,
      status,
      topic:kizuna_topics!inner(
        id,
        title,
        partnership_id
      )
    `
    )
    .eq("status", "active")
    .eq("kizuna_topics.partnership_id", partnership.id)
    .not("review_date", "is", null)
    .lte("review_date", sevenDaysLaterStr)
    .order("review_date", { ascending: true });

  if (error) {
    console.error("[Kizuna Review Alerts] Error fetching:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // アイテムを整形して、残り日数を計算
  const formattedItems = (items || []).map((item) => {
    const reviewDate = new Date(item.review_date!);
    const diffTime = reviewDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let urgency: "overdue" | "urgent" | "soon";
    if (diffDays < 0) {
      urgency = "overdue";
    } else if (diffDays <= 3) {
      urgency = "urgent";
    } else {
      urgency = "soon";
    }

    return {
      id: item.id,
      type: item.type,
      content: item.content,
      review_date: item.review_date,
      topic_id: (item.topic as any).id,
      topic_title: (item.topic as any).title,
      days_remaining: diffDays,
      urgency,
    };
  });

  return NextResponse.json({
    items: formattedItems,
    count: formattedItems.length,
  });
}

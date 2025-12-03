/**
 * 絆ノート - 一括作成API
 *
 * POST /api/kizuna/bulk-create - 会話から生成された項目を一括登録
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    const { partnershipId, talkId, items } = body;

    if (!partnershipId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // パートナーシップのアクセス権限チェック
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("id, user1_id, user2_id")
      .eq("id", partnershipId)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return NextResponse.json(
        { error: "Partnership not found" },
        { status: 404 }
      );
    }

    let createdTopicsCount = 0;
    let createdItemsCount = 0;

    // 項目ごとに処理
    for (const item of items) {
      let topicId = item.topicId;

      // 新規トピックの作成が必要な場合
      if (!topicId && item.topicTitle) {
        const { data: newTopic, error: topicError } = await supabase
          .from("kizuna_topics")
          .insert({
            partnership_id: partnershipId,
            title: item.topicTitle,
            status: "active",
            created_by: user.id,
          })
          .select()
          .single();

        if (topicError) {
          console.error("[Bulk Create] Error creating topic:", topicError);
          continue;
        }

        topicId = newTopic.id;
        createdTopicsCount++;
      }

      if (!topicId) {
        console.error("[Bulk Create] No topic ID for item:", item);
        continue;
      }

      // アイテムを作成
      const { error: itemError } = await supabase.from("kizuna_items").insert({
        topic_id: topicId,
        type: item.type,
        content: item.content,
        assignee: item.assignee,
        review_date: item.reviewDate || null,
        review_period: null, // 日付直接指定なのでperiodはnull
        status: "active",
        created_by: user.id,
        parent_item_id: null,
      });

      if (itemError) {
        console.error("[Bulk Create] Error creating item:", itemError);
        continue;
      }

      createdItemsCount++;

      // 気持ちやメモがあれば子アイテムとして追加
      const childItems = [];

      if (item.feeling) {
        childItems.push({
          topic_id: topicId,
          type: "my_feeling",
          content: item.feeling,
          assignee: null,
          review_date: null,
          review_period: null,
          status: "active",
          created_by: user.id,
        });
      }

      if (item.partnerFeeling) {
        childItems.push({
          topic_id: topicId,
          type: "partner_feeling",
          content: item.partnerFeeling,
          assignee: null,
          review_date: null,
          review_period: null,
          status: "active",
          created_by: user.id,
        });
      }

      if (item.memo) {
        childItems.push({
          topic_id: topicId,
          type: "memo",
          content: item.memo,
          assignee: null,
          review_date: null,
          review_period: null,
          status: "active",
          created_by: user.id,
        });
      }

      if (childItems.length > 0) {
        const { error: childError } = await supabase
          .from("kizuna_items")
          .insert(childItems);

        if (childError) {
          console.error("[Bulk Create] Error creating child items:", childError);
        }
      }
    }

    console.log(
      `[Bulk Create] Created ${createdTopicsCount} topics, ${createdItemsCount} items`
    );

    return NextResponse.json({
      success: true,
      createdTopics: createdTopicsCount,
      createdItems: createdItemsCount,
    });
  } catch (error) {
    console.error("[Bulk Create] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

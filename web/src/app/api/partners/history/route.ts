import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// DELETE - パートナーシップの履歴を論理削除
// 対象: 会話履歴(talks)、絆ノート(kizuna)、取説(manual)、AI相談(ai_consultations)
// 両ユーザーから見えなくなるが、データは残る
// 注意: 取説カバー画像は物理削除される（ストレージから削除）
// パートナーシップがなくてもAI相談は削除可能
export async function DELETE() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedAt = new Date().toISOString();
  let deletedCounts = {
    talks: 0,
    kizuna_topics: 0,
    manual_items: 0,
    ai_consultations: 0,
  };

  // 全パートナーシップを取得（active/unlinked、history_deleted_at問わず全件）
  const { data: partnerships } = await supabase
    .from("partnerships")
    .select("id, user1_id, user2_id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .in("status", ["active", "unlinked"]);

  const partnershipIds = partnerships?.map(p => p.id) || [];
  const partnerIds = partnerships?.map(p =>
    p.user1_id === user.id ? p.user2_id : p.user1_id
  ) || [];

  console.log("[History Delete] User:", user.id);
  console.log("[History Delete] Partnership IDs:", partnershipIds);
  console.log("[History Delete] Partner IDs:", partnerIds);

  // 取説カバー画像を物理削除（毎回必ず実行 - history_deleted_atの有無に関わらず）
  let coverImagesDeleted: string[] = [];
  let manualCoversDeleted = 0;

  for (const partnerId of partnerIds) {
    const coverPaths = [
      `${user.id}/${partnerId}`,
      `${partnerId}/${user.id}`,
    ];

    for (const basePath of coverPaths) {
      try {
        const { data: files } = await supabase.storage
          .from("manual-covers")
          .list(basePath);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${basePath}/${f.name}`);
          const { error: removeError } = await supabase.storage
            .from("manual-covers")
            .remove(filePaths);

          if (!removeError) {
            coverImagesDeleted.push(...filePaths);
            console.log("[History Delete] Deleted cover images:", filePaths);
          } else {
            console.error("[History Delete] Failed to remove cover images:", removeError);
          }
        }
      } catch (e) {
        console.log("[History Delete] Cover image deletion skipped:", basePath, e);
      }
    }

    // manual_coversテーブルのレコードも削除
    const { count: deletedCount } = await supabase
      .from("manual_covers")
      .delete({ count: "exact" })
      .or(`and(user_id.eq.${user.id},target_user_id.eq.${partnerId}),and(user_id.eq.${partnerId},target_user_id.eq.${user.id})`);

    manualCoversDeleted += deletedCount || 0;
  }

  console.log("[History Delete] Cover images deleted:", coverImagesDeleted.length);
  console.log("[History Delete] Manual covers records deleted:", manualCoversDeleted);

  // === talks の削除 ===
  // 対象: partnership_id IN (全パートナーシップ) OR (owner_user_id = me AND partnership_id IS NULL)
  if (partnershipIds.length > 0) {
    // パートナーシップに紐づくトーク
    const { count: partnershipTalksCount } = await supabase
      .from("talks")
      .select("id", { count: "exact" })
      .in("partnership_id", partnershipIds)
      .is("deleted_at", null);

    if (partnershipTalksCount && partnershipTalksCount > 0) {
      await supabase
        .from("talks")
        .update({ deleted_at: deletedAt })
        .in("partnership_id", partnershipIds)
        .is("deleted_at", null);
      deletedCounts.talks += partnershipTalksCount;
    }
  }

  // ソロトーク（partnership_id IS NULL）
  const { count: soloTalksCount } = await supabase
    .from("talks")
    .select("id", { count: "exact" })
    .eq("owner_user_id", user.id)
    .is("partnership_id", null)
    .is("deleted_at", null);

  if (soloTalksCount && soloTalksCount > 0) {
    await supabase
      .from("talks")
      .update({ deleted_at: deletedAt })
      .eq("owner_user_id", user.id)
      .is("partnership_id", null)
      .is("deleted_at", null);
    deletedCounts.talks += soloTalksCount;
  }

  console.log("[History Delete] Talks deleted:", deletedCounts.talks);

  // === kizuna_topics の削除 ===
  // パートナーシップに紐づくもの
  if (partnershipIds.length > 0) {
    const { count: partnershipKizunaCount } = await supabase
      .from("kizuna_topics")
      .select("id", { count: "exact" })
      .in("partnership_id", partnershipIds)
      .is("deleted_at", null);

    if (partnershipKizunaCount && partnershipKizunaCount > 0) {
      await supabase
        .from("kizuna_topics")
        .update({ deleted_at: deletedAt })
        .in("partnership_id", partnershipIds)
        .is("deleted_at", null);
      deletedCounts.kizuna_topics += partnershipKizunaCount;
    }
  }

  // ソロ絆ノート（partnership_id IS NULL）
  const { count: soloKizunaCount } = await supabase
    .from("kizuna_topics")
    .select("id", { count: "exact" })
    .is("partnership_id", null)
    .eq("created_by", user.id)
    .is("deleted_at", null);

  if (soloKizunaCount && soloKizunaCount > 0) {
    await supabase
      .from("kizuna_topics")
      .update({ deleted_at: deletedAt })
      .is("partnership_id", null)
      .eq("created_by", user.id)
      .is("deleted_at", null);
    deletedCounts.kizuna_topics += soloKizunaCount;
  }

  console.log("[History Delete] Kizuna topics deleted:", deletedCounts.kizuna_topics);

  // === manual_items の削除 ===
  const { count: manualCount } = await supabase
    .from("manual_items")
    .select("id", { count: "exact" })
    .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
    .is("deleted_at", null);

  if (manualCount && manualCount > 0) {
    await supabase
      .from("manual_items")
      .update({ deleted_at: deletedAt })
      .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .is("deleted_at", null);
    deletedCounts.manual_items = manualCount;
  }

  console.log("[History Delete] Manual items deleted:", deletedCounts.manual_items);

  // === ai_consultations の削除 ===
  const { count: aiCount } = await supabase
    .from("ai_consultations")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (aiCount && aiCount > 0) {
    await supabase
      .from("ai_consultations")
      .update({ deleted_at: deletedAt })
      .eq("user_id", user.id)
      .is("deleted_at", null);
    deletedCounts.ai_consultations = aiCount;
  }

  console.log("[History Delete] AI consultations deleted:", deletedCounts.ai_consultations);

  // === 全パートナーシップの history_deleted_at を更新 ===
  if (partnershipIds.length > 0) {
    await supabase
      .from("partnerships")
      .update({ history_deleted_at: deletedAt })
      .in("id", partnershipIds);
    console.log("[History Delete] Updated history_deleted_at for partnerships:", partnershipIds);
  }

  const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);

  console.log("[History Delete] Total deleted:", totalDeleted, deletedCounts);

  if (totalDeleted === 0 && coverImagesDeleted.length === 0) {
    return NextResponse.json({
      success: true,
      message: "削除対象の履歴がありません",
      deleted: deletedCounts,
      partnershipIds,
      coverImages: {
        storageDeleted: coverImagesDeleted.length,
        tableDeleted: manualCoversDeleted,
      },
    });
  }

  return NextResponse.json({
    success: true,
    message: "履歴を削除しました",
    deleted: deletedCounts,
    partnershipIds,
    coverImages: {
      storageDeleted: coverImagesDeleted.length,
      tableDeleted: manualCoversDeleted,
    },
  });
}

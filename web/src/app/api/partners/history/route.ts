import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// DELETE - Delete all conversation history for current user in unlinked partnerships
export async function DELETE() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all unlinked partnerships for this user
  const { data: unlinkedPartnerships } = await supabase
    .from("partnerships")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "unlinked");

  if (!unlinkedPartnerships || unlinkedPartnerships.length === 0) {
    return NextResponse.json({
      success: true,
      message: "削除対象の履歴がありません",
      deleted: { talks: 0, promises: 0 }
    });
  }

  const partnershipIds = unlinkedPartnerships.map(p => p.id);

  // Delete promises for these partnerships
  const { count: deletedPromises } = await supabase
    .from("promises")
    .delete({ count: "exact" })
    .in("partnership_id", partnershipIds);

  // Get talks for these partnerships
  const { data: talks } = await supabase
    .from("talks")
    .select("id")
    .in("partnership_id", partnershipIds);

  let deletedMessages = 0;
  if (talks && talks.length > 0) {
    const talkIds = talks.map(t => t.id);

    // Delete talk messages first
    const { count } = await supabase
      .from("talk_messages")
      .delete({ count: "exact" })
      .in("talk_id", talkIds);

    deletedMessages = count || 0;
  }

  // Delete talks
  const { count: deletedTalks } = await supabase
    .from("talks")
    .delete({ count: "exact" })
    .in("partnership_id", partnershipIds);

  return NextResponse.json({
    success: true,
    deleted: {
      talks: deletedTalks || 0,
      messages: deletedMessages,
      promises: deletedPromises || 0,
    }
  });
}

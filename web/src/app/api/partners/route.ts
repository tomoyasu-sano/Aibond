import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Get current partnership
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: partnership } = await supabase
    .from("partnerships")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  if (!partnership) {
    return NextResponse.json({ partnership: null, partner: null });
  }

  // Get partner info
  const partnerId = partnership.user1_id === user.id
    ? partnership.user2_id
    : partnership.user1_id;

  const { data: partner } = await supabase
    .from("user_profiles")
    .select("id, display_name, language")
    .eq("id", partnerId)
    .single();

  return NextResponse.json({ partnership, partner });
}

// DELETE - Unlink partnership (set status to 'unlinked')
export async function DELETE() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find active partnership
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  if (!partnership) {
    return NextResponse.json(
      { error: "連携中のパートナーがいません" },
      { status: 400 }
    );
  }

  // Set status to 'unlinked' instead of deleting
  const { error } = await supabase
    .from("partnerships")
    .update({ status: "unlinked" })
    .eq("id", partnership.id);

  if (error) {
    console.error("Error unlinking partnership:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

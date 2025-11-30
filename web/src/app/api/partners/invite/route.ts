import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Generate a random invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST - Create a new invitation
export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has an active partnership
  const { data: existingPartnership } = await supabase
    .from("partnerships")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  if (existingPartnership) {
    return NextResponse.json(
      { error: "既にパートナーと連携しています" },
      { status: 400 }
    );
  }

  // Check for existing unused invitation
  const { data: existingInvite } = await supabase
    .from("partner_invitations")
    .select("*")
    .eq("inviter_id", user.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (existingInvite) {
    return NextResponse.json({ invitation: existingInvite });
  }

  // Create new invitation (expires in 24 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const { data: invitation, error } = await supabase
    .from("partner_invitations")
    .insert({
      inviter_id: user.id,
      invite_code: generateInviteCode(),
      expires_at: expiresAt.toISOString(),
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invitation });
}

// GET - Get current invitation
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: invitation } = await supabase
    .from("partner_invitations")
    .select("*")
    .eq("inviter_id", user.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  return NextResponse.json({ invitation: invitation || null });
}

// DELETE - Cancel invitation
export async function DELETE() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("partner_invitations")
    .update({ status: "cancelled" })
    .eq("inviter_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

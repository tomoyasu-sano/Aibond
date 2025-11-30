import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Accept invitation and create partnership
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { invite_code } = body;

  if (!invite_code) {
    return NextResponse.json(
      { error: "招待コードを入力してください" },
      { status: 400 }
    );
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

  // First, find any invitation with this code (for debugging)
  const { data: anyInvite } = await supabase
    .from("partner_invitations")
    .select("*")
    .eq("invite_code", invite_code.toUpperCase())
    .single();

  console.log("Input code:", invite_code.toUpperCase());
  console.log("Found invitation (any status):", anyInvite);
  console.log("Current time:", new Date().toISOString());

  // Find the invitation (status = 'pending' means not used yet)
  const { data: invitation, error: inviteError } = await supabase
    .from("partner_invitations")
    .select("*")
    .eq("invite_code", invite_code.toUpperCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (inviteError || !invitation) {
    console.log("Invitation error:", inviteError);
    return NextResponse.json(
      { error: "招待コードが無効か期限切れです" },
      { status: 400 }
    );
  }

  // Can't join own invitation
  if (invitation.inviter_id === user.id) {
    return NextResponse.json(
      { error: "自分の招待コードは使用できません" },
      { status: 400 }
    );
  }

  // Normalize user IDs (smaller UUID = user1_id)
  const [user1_id, user2_id] = [invitation.inviter_id, user.id].sort();

  // Get inviter's language as main_language
  const { data: inviterProfile } = await supabase
    .from("user_profiles")
    .select("language")
    .eq("id", invitation.inviter_id)
    .single();

  const mainLanguage = inviterProfile?.language || "ja";

  // Create partnership
  const { data: partnership, error: partnershipError } = await supabase
    .from("partnerships")
    .insert({
      user1_id,
      user2_id,
      main_language: mainLanguage,
      status: "active",
    })
    .select()
    .single();

  if (partnershipError) {
    console.error("Error creating partnership:", partnershipError);
    return NextResponse.json(
      { error: "パートナーシップの作成に失敗しました" },
      { status: 500 }
    );
  }

  // Mark invitation as used
  await supabase
    .from("partner_invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  return NextResponse.json({ partnership });
}

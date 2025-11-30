import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - List all talks for user
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's partnership
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  // Get talks - own talks or partnership talks
  let query = supabase
    .from("talks")
    .select("*")
    .order("created_at", { ascending: false });

  if (partnership) {
    query = query.or(`owner_user_id.eq.${user.id},partnership_id.eq.${partnership.id}`);
  } else {
    query = query.eq("owner_user_id", user.id);
  }

  const { data: talks, error } = await query;

  if (error) {
    console.error("Error fetching talks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ talks: talks || [] });
}

// POST - Create new talk (start recording)
export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's profile for speaker name
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // Get partnership if exists
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("id, user1_id, user2_id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  // Get partner profile if partnership exists
  let partnerName = null;
  let partnerId = null;
  if (partnership) {
    partnerId = partnership.user1_id === user.id
      ? partnership.user2_id
      : partnership.user1_id;

    const { data: partnerProfile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", partnerId)
      .single();

    partnerName = partnerProfile?.display_name;
  }

  // Create new talk
  const { data: talk, error } = await supabase
    .from("talks")
    .insert({
      owner_user_id: user.id,
      partnership_id: partnership?.id || null,
      started_at: new Date().toISOString(),
      status: "active",
      is_paused: false,
      total_pause_seconds: 0,
      speaker1_user_id: user.id,
      speaker1_name: profile?.display_name || "話者1",
      speaker2_user_id: partnerId,
      speaker2_name: partnerName || "話者2",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating talk:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ talk });
}

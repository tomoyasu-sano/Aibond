import { createClient } from "@/lib/supabase/server";
import { ensureCurrentPeriodUsage } from "@/lib/usage/client";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile
  let { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If profile doesn't exist, create it
  if (profileError && profileError.code === "PGRST116") {
    const { data: newProfile, error: createError } = await supabase
      .from("user_profiles")
      .insert({ id: user.id, language: "ja" })
      .select()
      .single();

    if (createError) {
      console.error("Error creating profile:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    profile = newProfile;
    profileError = null;
  }

  if (profileError) {
    console.error("Profile error:", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Get subscription
  let { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If subscription doesn't exist, create it
  if (subscriptionError && subscriptionError.code === "PGRST116") {
    const { data: newSubscription, error: createError } = await supabase
      .from("subscriptions")
      .insert({ user_id: user.id, plan: "free" })
      .select()
      .single();

    if (createError) {
      console.error("Error creating subscription:", createError);
    } else {
      subscription = newSubscription;
    }
    subscriptionError = null;
  }

  if (subscriptionError && subscriptionError.code !== "PGRST116") {
    console.error("Subscription error:", subscriptionError);
  }

  // 月初リセット: 新しい月のアクセス時にusageレコードを自動作成
  await ensureCurrentPeriodUsage(supabase, user.id);

  // Get current month usage
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data: usage, error: usageError } = await supabase
    .from("usage")
    .select("*")
    .eq("user_id", user.id)
    .eq("period", period)
    .single();

  if (usageError && usageError.code !== "PGRST116") {
    console.error("Usage error:", usageError);
  }

  // Get partnership
  const { data: partnership, error: partnershipError } = await supabase
    .from("partnerships")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  console.log("Profile API - User ID:", user.id);
  console.log("Profile API - Partnership:", partnership);
  console.log("Profile API - Partnership error:", partnershipError);

  if (partnershipError && partnershipError.code !== "PGRST116") {
    console.error("Partnership error:", partnershipError);
  }

  // Get partner info if partnership exists
  let partner = null;
  if (partnership) {
    const partnerId = partnership.user1_id === user.id
      ? partnership.user2_id
      : partnership.user1_id;

    console.log("Profile API - Partner ID:", partnerId);

    const { data: partnerProfile, error: partnerError } = await supabase
      .from("user_profiles")
      .select("id, display_name, language")
      .eq("id", partnerId)
      .single();

    console.log("Profile API - Partner profile:", partnerProfile);
    console.log("Profile API - Partner error:", partnerError);

    partner = partnerProfile;
  }

  console.log("Profile API - Subscription data:", subscription);

  return NextResponse.json({
    profile,
    subscription: subscription || { plan: "free" },
    usage: usage || { minutes_used: 0, minutes_limit: 120 },
    partnership: partnership || null,
    partner,
    email: user.email,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { display_name, language } = body;

  // Validate display_name (max 32 characters)
  if (display_name && display_name.length > 32) {
    return NextResponse.json({ error: "Display name must be 32 characters or less" }, { status: 400 });
  }

  // Validate language
  const validLanguages = ["ja", "en", "zh", "ko", "es", "fr", "de", "pt", "vi", "th", "id", "tl"];
  if (language && !validLanguages.includes(language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const updateData: Record<string, string> = {};
  if (display_name !== undefined) updateData.display_name = display_name?.slice(0, 32) || display_name;
  if (language !== undefined) updateData.language = language;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .update(updateData)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

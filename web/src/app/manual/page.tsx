import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ManualContent } from "@/components/manual/ManualContent";

export default async function ManualPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ユーザープロフィールを取得
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // パートナーシップを取得
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  // パートナー情報を取得
  let partner = null;
  if (partnership) {
    const partnerId =
      partnership.user1_id === user.id
        ? partnership.user2_id
        : partnership.user1_id;

    const { data: partnerProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", partnerId)
      .single();

    partner = partnerProfile
      ? {
          id: partnerId,
          name: partnerProfile.display_name || partnerProfile.name,
        }
      : null;
  }

  return (
    <ManualContent
      userId={user.id}
      userName={profile?.display_name || profile?.name || ""}
      partner={partner}
      partnershipId={partnership?.id}
    />
  );
}

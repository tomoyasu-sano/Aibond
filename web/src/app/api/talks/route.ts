import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - List all talks for user
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's active partnership (status='active' のもの)
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  // Get talks with partnership info (LEFT JOIN)
  // partnership_id が NULL のもの、または history_deleted_at が NULL のパートナーシップのもののみ表示
  // 論理削除されたものは除外
  const { data: talks, error } = await supabase
    .from("talks")
    .select("*, partnership:partnerships!left(id, history_deleted_at)")
    .or(
      partnership
        ? `owner_user_id.eq.${user.id},partnership_id.eq.${partnership.id}`
        : `owner_user_id.eq.${user.id}`
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching talks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // フィルタリング: partnership_id が NULL か、パートナーシップが存在するもののみ
  // history_deleted_at が設定されていても、連携中ならトークを表示する
  const filteredTalks = (talks || []).filter((talk) => {
    // partnership_id が NULL の場合は表示
    if (!talk.partnership_id) return true;
    // partnership が取得できれば表示（history_deleted_at は無視）
    const p = talk.partnership as { id: string; history_deleted_at: string | null } | null;
    if (p) return true;
    // パートナーシップが取得できない場合は非表示
    return false;
  });

  // partnership フィールドを除去してレスポンス
  const talksWithoutPartnership = filteredTalks.map(({ partnership, ...rest }) => rest);

  return NextResponse.json({ talks: talksWithoutPartnership });
}

// POST - Create new talk (start recording)
export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's profile for speaker name (adminクライアントで確実に取得)
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  // 自分の名前を確定（フォールバック付き）
  let myName = profile?.display_name;
  if (!myName) {
    // フォールバック: emailのローカル部を使用
    myName = user.email?.split("@")[0] || "自分";
  }

  // Get partnership if exists (status='active' のもの)
  // history_deleted_at が設定されていても、連携中ならパートナー名を取得する
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("id, user1_id, user2_id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .eq("status", "active")
    .single();

  // Get partner profile if partnership exists
  // RLSをバイパスするためにadminクライアントを使用
  let partnerName: string | null = null;
  let partnerId: string | null = null;
  if (partnership) {
    partnerId = partnership.user1_id === user.id
      ? partnership.user2_id
      : partnership.user1_id;

    // adminクライアントでパートナーのプロファイルを確実に取得
    const { data: partnerProfile } = await adminClient
      .from("user_profiles")
      .select("display_name")
      .eq("id", partnerId)
      .single();

    // display_nameが取得できた場合はそれを使用
    if (partnerProfile?.display_name) {
      partnerName = partnerProfile.display_name;
    } else if (partnerId) {
      // フォールバック: auth.usersからemailを取得してローカル部を使用
      const { data: authUser } = await adminClient.auth.admin.getUserById(partnerId);
      if (authUser?.user?.email) {
        partnerName = authUser.user.email.split("@")[0];
      }
    }
  }

  // Create new talk (status: ready = 録音待機中、録音開始時にactiveに変更)
  // speaker*_name は必ず非null文字列にする（スナップショットとして保存）
  const { data: talk, error } = await supabase
    .from("talks")
    .insert({
      owner_user_id: user.id,
      partnership_id: partnership?.id || null,
      started_at: new Date().toISOString(),
      status: "ready",
      is_paused: false,
      total_pause_seconds: 0,
      speaker1_user_id: user.id,
      speaker1_name: myName,
      speaker2_user_id: partnerId,
      speaker2_name: partnerName || "パートナー",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating talk:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ talk });
}

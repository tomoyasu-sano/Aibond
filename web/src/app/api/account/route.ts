/**
 * Account API
 *
 * DELETE /api/account - アカウント削除（データ匿名化）
 */

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Supabase Admin Client（RLSをバイパス）
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const adminSupabase = getSupabaseAdmin();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  console.log("[Account Delete] Starting deletion for user:", userId);

  try {
    // 1. Stripeサブスクリプションをキャンセル
    const { data: subscription } = await adminSupabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .single();

    if (subscription?.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        console.log("[Account Delete] Stripe subscription canceled");
      } catch (stripeError) {
        console.error("[Account Delete] Stripe cancel error:", stripeError);
        // Stripeエラーの場合は削除を中止
        return NextResponse.json(
          {
            error: "サブスクリプションのキャンセルに失敗しました。Stripe Customer Portalでサブスクリプションをキャンセルしてから、再度お試しください。",
            details: stripeError instanceof Error ? stripeError.message : String(stripeError)
          },
          { status: 500 }
        );
      }
    }

    // 2. 所有するトークを匿名化（owner_user_id = NULL）
    const { error: talksError } = await adminSupabase
      .from("talks")
      .update({ owner_user_id: null })
      .eq("owner_user_id", userId);

    if (talksError) {
      console.error("[Account Delete] Talks anonymization error:", talksError);
    }

    // 3. パートナーシップを匿名化
    // user1_idを匿名化
    const { error: partnership1Error } = await adminSupabase
      .from("partnerships")
      .update({
        user1_id: null,
        partnership_name: null,
      })
      .eq("user1_id", userId);

    if (partnership1Error) {
      console.error("[Account Delete] Partnership1 anonymization error:", partnership1Error);
    }

    // user2_idを匿名化
    const { error: partnership2Error } = await adminSupabase
      .from("partnerships")
      .update({
        user2_id: null,
        partnership_name: null,
      })
      .eq("user2_id", userId);

    if (partnership2Error) {
      console.error("[Account Delete] Partnership2 anonymization error:", partnership2Error);
    }

    // 4. AI相談履歴を匿名化（学習データとして保持、グループ化維持）
    // anonymous_user_idを設定してからuser_idをNULLに
    const anonymousId = crypto.randomUUID();

    const { error: aiError } = await adminSupabase
      .from("ai_consultations")
      .update({
        anonymous_user_id: anonymousId,
        user_id: null,
      })
      .eq("user_id", userId);

    if (aiError) {
      console.error("[Account Delete] AI consultations anonymization error:", aiError);
    } else {
      console.log("[Account Delete] AI consultations anonymized with anonymous_user_id:", anonymousId);
    }

    // 5. 使用量記録を削除
    const { error: usageError } = await adminSupabase
      .from("usage")
      .delete()
      .eq("user_id", userId);

    if (usageError) {
      console.error("[Account Delete] Usage delete error:", usageError);
    }

    // 6. サブスクリプション記録を削除
    const { error: subError } = await adminSupabase
      .from("subscriptions")
      .delete()
      .eq("user_id", userId);

    if (subError) {
      console.error("[Account Delete] Subscription delete error:", subError);
    }

    // 7. 招待コードを削除
    const { error: inviteError } = await adminSupabase
      .from("partner_invites")
      .delete()
      .eq("inviter_user_id", userId);

    if (inviteError) {
      console.error("[Account Delete] Invites delete error:", inviteError);
    }

    // 8. ユーザープロフィールを削除
    const { error: profileError } = await adminSupabase
      .from("user_profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("[Account Delete] Profile delete error:", profileError);
      return NextResponse.json(
        { error: "Failed to delete profile" },
        { status: 500 }
      );
    }

    // 9. Supabase Auth からユーザーを削除
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("[Account Delete] Auth delete error:", authError);
      return NextResponse.json(
        { error: "Failed to delete auth user" },
        { status: 500 }
      );
    }

    console.log("[Account Delete] Successfully deleted user:", userId);

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully. Audio and conversation data has been anonymized and retained for service improvement.",
    });
  } catch (error) {
    console.error("[Account Delete] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

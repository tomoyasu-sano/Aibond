/**
 * Account API
 *
 * DELETE /api/account - アカウント削除（データ匿名化）
 */

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { anonymizeAudioMetadata } from "@/lib/gcs/client";

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

  // 統一された匿名IDを生成（全データを紐付けるため）
  const anonymousUserId = crypto.randomUUID();
  console.log("[Account Delete] Generated anonymous user ID:", anonymousUserId);

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
      } catch (stripeError: any) {
        console.error("[Account Delete] Stripe cancel error:", stripeError);

        // サブスクリプションが見つからない場合は警告のみで続行
        // (既にキャンセル済み、または異なるモードのサブスクリプション)
        const isNotFoundError =
          stripeError?.type === 'StripeInvalidRequestError' &&
          (stripeError?.message?.includes('No such subscription') ||
           stripeError?.code === 'resource_missing');

        if (isNotFoundError) {
          console.warn("[Account Delete] Subscription not found, continuing deletion:", subscription.stripe_subscription_id);
        } else {
          // その他のStripeエラーの場合は削除を中止
          return NextResponse.json(
            {
              error: "サブスクリプションのキャンセルに失敗しました。Stripe Customer Portalでサブスクリプションをキャンセルしてから、再度お試しください。",
              details: stripeError instanceof Error ? stripeError.message : String(stripeError)
            },
            { status: 500 }
          );
        }
      }
    }

    // 2. 所有するトークを匿名化（owner_user_id, speaker1_user_id, speaker2_user_id = NULL, anonymous_owner_id設定）
    // owner_user_idをNULLに、anonymous_owner_idを設定
    const { error: talksOwnerError } = await adminSupabase
      .from("talks")
      .update({
        anonymous_owner_id: anonymousUserId,
        owner_user_id: null
      })
      .eq("owner_user_id", userId);

    if (talksOwnerError) {
      console.error("[Account Delete] Talks owner anonymization error:", talksOwnerError);
    }

    // speaker1_user_idをNULLに
    const { error: talksSpeaker1Error } = await adminSupabase
      .from("talks")
      .update({ speaker1_user_id: null })
      .eq("speaker1_user_id", userId);

    if (talksSpeaker1Error) {
      console.error("[Account Delete] Talks speaker1 anonymization error:", talksSpeaker1Error);
    }

    // speaker2_user_idをNULLに
    const { error: talksSpeaker2Error } = await adminSupabase
      .from("talks")
      .update({ speaker2_user_id: null })
      .eq("speaker2_user_id", userId);

    if (talksSpeaker2Error) {
      console.error("[Account Delete] Talks speaker2 anonymization error:", talksSpeaker2Error);
    }

    // 2.5. GCS音声ファイルのメタデータを匿名化
    // このユーザーが所有するtalksのIDを取得
    const { data: userTalks } = await adminSupabase
      .from("talks")
      .select("id")
      .eq("anonymous_owner_id", anonymousUserId);

    if (userTalks && userTalks.length > 0) {
      console.log(`[Account Delete] Anonymizing ${userTalks.length} audio files in GCS`);

      // 各talkの音声ファイルのメタデータを更新
      const anonymizationPromises = userTalks.map(talk =>
        anonymizeAudioMetadata(talk.id, anonymousUserId)
      );

      await Promise.allSettled(anonymizationPromises);
      console.log("[Account Delete] GCS audio files anonymization completed");
    }

    // 3. パートナーシップに関連するデータを削除
    // まず、talk_sentimentsを削除（partnerships への外部キー制約があるため先に削除）
    const { data: userPartnerships } = await adminSupabase
      .from("partnerships")
      .select("id")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (userPartnerships && userPartnerships.length > 0) {
      const partnershipIds = userPartnerships.map(p => p.id);
      const { error: sentimentsError } = await adminSupabase
        .from("talk_sentiments")
        .delete()
        .in("partnership_id", partnershipIds);

      if (sentimentsError) {
        console.error("[Account Delete] Talk sentiments delete error:", sentimentsError);
      }
    }

    // 次に、パートナーシップを削除
    const { error: partnershipError } = await adminSupabase
      .from("partnerships")
      .delete()
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (partnershipError) {
      console.error("[Account Delete] Partnership delete error:", partnershipError);
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
      .from("partner_invitations")
      .delete()
      .eq("inviter_id", userId);

    if (inviteError) {
      console.error("[Account Delete] Invites delete error:", inviteError);
    }

    // 8. Kizuna関連データを匿名化（学習データとして保持）
    // kizuna_feedbacksを匿名化
    const { error: kizunaFeedbacksError } = await adminSupabase
      .from("kizuna_feedbacks")
      .update({
        anonymous_user_id: anonymousUserId,
        user_id: null
      })
      .eq("user_id", userId);

    if (kizunaFeedbacksError) {
      console.error("[Account Delete] Kizuna feedbacks anonymization error:", kizunaFeedbacksError);
    }

    // kizuna_reviewsを匿名化
    const { error: kizunaReviewsError } = await adminSupabase
      .from("kizuna_reviews")
      .update({
        anonymous_user_id: anonymousUserId,
        created_by: null
      })
      .eq("created_by", userId);

    if (kizunaReviewsError) {
      console.error("[Account Delete] Kizuna reviews anonymization error:", kizunaReviewsError);
    }

    // kizuna_itemsを匿名化
    const { error: kizunaItemsError } = await adminSupabase
      .from("kizuna_items")
      .update({
        anonymous_user_id: anonymousUserId,
        created_by: null
      })
      .eq("created_by", userId);

    if (kizunaItemsError) {
      console.error("[Account Delete] Kizuna items anonymization error:", kizunaItemsError);
    }

    // kizuna_topicsを匿名化
    const { error: kizunaTopicsError } = await adminSupabase
      .from("kizuna_topics")
      .update({
        anonymous_user_id: anonymousUserId,
        created_by: null
      })
      .eq("created_by", userId);

    if (kizunaTopicsError) {
      console.error("[Account Delete] Kizuna topics anonymization error:", kizunaTopicsError);
    }

    // 9. Manual items を匿名化（学習データとして保持）
    // user_idとtarget_user_idの両方をチェック
    const { error: manualError } = await adminSupabase
      .from("manual_items")
      .update({
        anonymous_user_id: anonymousUserId,
        user_id: null,
        target_user_id: null
      })
      .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);

    if (manualError) {
      console.error("[Account Delete] Manual items anonymization error:", manualError);
    }

    // 10. ユーザープロフィールを削除
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

    // 11. Auth関連データを削除（カスケード削除が機能しないため）
    const { error: authDataError } = await adminSupabase.rpc('delete_user_auth_data', {
      target_user_id: userId
    });

    if (authDataError) {
      console.error("[Account Delete] Auth data delete error:", authDataError);
    }

    // 12. Supabase Auth からユーザーを削除
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

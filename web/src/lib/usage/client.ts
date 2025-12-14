/**
 * Usage Management Utility
 *
 * 使用量の更新・チェック・警告メール送信
 */

import { sendEmail } from "@/lib/email/client";
import { usageWarning80Email, usageLimitReachedEmail } from "@/lib/email/templates";
import { SupabaseClient } from "@supabase/supabase-js";

// プラン名の表示用マッピング
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: "Free",
  standard: "Standard",
  premium: "Premium",
};

interface UsageCheckResult {
  canStartTalk: boolean;
  minutesUsed: number;
  minutesLimit: number;
  remainingMinutes: number;
  usagePercent: number;
}

/**
 * 使用量をチェック
 */
export async function checkUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageCheckResult> {
  const period = new Date().toISOString().slice(0, 7);

  const { data: usage } = await supabase
    .from("usage")
    .select("minutes_used, minutes_limit")
    .eq("user_id", userId)
    .eq("period", period)
    .single();

  const minutesUsed = usage?.minutes_used || 0;
  const minutesLimit = usage?.minutes_limit || 60; // デフォルトはFree（1時間）
  const remainingMinutes = Math.max(0, minutesLimit - minutesUsed);
  const usagePercent = minutesLimit > 0 ? Math.round((minutesUsed / minutesLimit) * 100) : 0;

  return {
    canStartTalk: remainingMinutes > 0,
    minutesUsed,
    minutesLimit,
    remainingMinutes,
    usagePercent,
  };
}

/**
 * 使用量を更新し、必要に応じて警告メールを送信
 */
export async function updateUsageAndNotify(
  supabase: SupabaseClient,
  userId: string,
  minutesToAdd: number
): Promise<{ success: boolean; newUsagePercent: number }> {
  const period = new Date().toISOString().slice(0, 7);

  // 現在の使用量を取得
  const { data: usage } = await supabase
    .from("usage")
    .select("minutes_used, minutes_limit")
    .eq("user_id", userId)
    .eq("period", period)
    .single();

  const currentMinutes = usage?.minutes_used || 0;
  const minutesLimit = usage?.minutes_limit || 120;
  const newMinutes = currentMinutes + minutesToAdd;
  const newUsagePercent = minutesLimit > 0 ? Math.round((newMinutes / minutesLimit) * 100) : 0;
  const previousPercent = minutesLimit > 0 ? Math.round((currentMinutes / minutesLimit) * 100) : 0;

  // 使用量を更新
  const { error } = await supabase
    .from("usage")
    .update({
      minutes_used: newMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("period", period);

  if (error) {
    console.error("[Usage] Error updating usage:", error);
    return { success: false, newUsagePercent };
  }

  console.log(`[Usage] Updated usage for user ${userId}: ${currentMinutes} -> ${newMinutes} minutes (${newUsagePercent}%)`);

  // 警告メール送信のチェック
  // 80%到達時（前回80%未満 → 今回80%以上）
  if (previousPercent < 80 && newUsagePercent >= 80 && newUsagePercent < 100) {
    await sendUsageWarningEmail(supabase, userId, newMinutes, minutesLimit, "80%");
  }
  // 100%到達時（前回100%未満 → 今回100%以上）
  else if (previousPercent < 100 && newUsagePercent >= 100) {
    await sendUsageWarningEmail(supabase, userId, newMinutes, minutesLimit, "100%");
  }

  return { success: true, newUsagePercent };
}

/**
 * 使用量警告メールを送信
 */
async function sendUsageWarningEmail(
  supabase: SupabaseClient,
  userId: string,
  minutesUsed: number,
  minutesLimit: number,
  threshold: "80%" | "100%"
): Promise<void> {
  try {
    // ユーザー情報を取得
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    // サブスクリプション情報を取得
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .single();

    // メールアドレスを取得
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = authData?.user?.email;

    if (!userEmail) {
      console.error("[Usage] No email found for user:", userId);
      return;
    }

    const plan = PLAN_DISPLAY_NAMES[subscription?.plan || "free"];
    const userName = profile?.display_name;

    let emailContent;
    if (threshold === "80%") {
      emailContent = usageWarning80Email(userName, minutesUsed, minutesLimit, plan);
    } else {
      emailContent = usageLimitReachedEmail(userName, minutesLimit, plan);
    }

    const sent = await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (sent) {
      console.log(`[Usage] ${threshold} warning email sent to:`, userEmail);
    } else {
      console.error(`[Usage] Failed to send ${threshold} warning email to:`, userEmail);
    }
  } catch (error) {
    console.error("[Usage] Error sending warning email:", error);
  }
}

/**
 * 月初リセット（新しい月のアクセス時に呼び出される）
 */
export async function ensureCurrentPeriodUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const period = new Date().toISOString().slice(0, 7);

  // 現在の月のusageレコードがあるか確認
  const { data: existingUsage } = await supabase
    .from("usage")
    .select("id")
    .eq("user_id", userId)
    .eq("period", period)
    .single();

  if (existingUsage) {
    // 既に存在する場合は何もしない
    return;
  }

  // サブスクリプション情報からminutes_limitを取得
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .single();

  const plan = subscription?.plan || "free";
  let minutesLimit = 60; // Free: 1時間

  if (plan === "light") {
    minutesLimit = 300; // Light: 5時間
  } else if (plan === "standard") {
    minutesLimit = 600; // Standard: 10時間
  } else if (plan === "premium") {
    minutesLimit = 1500; // Premium: 25時間
  }

  // 新しい月のusageレコードを作成
  const { error } = await supabase.from("usage").insert({
    user_id: userId,
    period: period,
    minutes_used: 0,
    minutes_limit: minutesLimit,
  });

  if (error) {
    // UNIQUE制約違反は無視（並行リクエストで作成された可能性）
    if (error.code !== "23505") {
      console.error("[Usage] Error creating new period usage:", error);
    }
  } else {
    console.log(`[Usage] Created new period usage for user ${userId}: ${period}, limit: ${minutesLimit} minutes`);
  }
}

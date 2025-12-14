/**
 * Stripe Webhook API
 *
 * POST /api/webhooks/stripe - Stripeイベント処理
 */

import { getStripe, STRIPE_PLANS } from "@/lib/stripe/client";
import { sendEmail } from "@/lib/email/client";
import { paymentFailedEmail } from "@/lib/email/templates";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Supabase Admin Client（RLSをバイパス）
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[Stripe Webhook] Event received:", event.type);

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log("[Stripe Webhook] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

/**
 * Checkout完了時の処理
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  session: Stripe.Checkout.Session
) {
  console.log("[Stripe Webhook] handleCheckoutCompleted called");
  console.log("[Stripe Webhook] Session metadata:", session.metadata);
  console.log("[Stripe Webhook] Session subscription:", session.subscription);
  console.log("[Stripe Webhook] Session customer:", session.customer);

  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan as "light" | "standard" | "premium";
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!userId || !plan) {
    console.error("[Stripe Webhook] Missing metadata in checkout session - userId:", userId, "plan:", plan);
    return;
  }

  if (!subscriptionId) {
    console.error("[Stripe Webhook] Missing subscriptionId in checkout session");
    return;
  }

  console.log("[Stripe Webhook] Checkout completed for user:", userId, "plan:", plan);

  // サブスクリプション情報を取得
  const stripe = getStripe();
  console.log("[Stripe Webhook] Retrieving subscription:", subscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId) as any;
  console.log("[Stripe Webhook] Subscription retrieved:", {
    id: subscriptionData.id,
    current_period_end: subscriptionData.current_period_end,
    status: subscriptionData.status,
  });

  const planConfig = STRIPE_PLANS[plan];
  console.log("[Stripe Webhook] Plan config:", planConfig);

  // current_period_endを安全に変換
  let currentPeriodEnd: string | null = null;
  if (subscriptionData.current_period_end && typeof subscriptionData.current_period_end === 'number') {
    currentPeriodEnd = new Date(subscriptionData.current_period_end * 1000).toISOString();
  }
  console.log("[Stripe Webhook] Current period end:", currentPeriodEnd);

  // subscriptionsテーブルを更新
  console.log("[Stripe Webhook] Updating subscriptions table for user:", userId);
  const { error, data } = await supabase
    .from("subscriptions")
    .update({
      plan: plan,
      status: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
      scheduled_plan: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select();

  console.log("[Stripe Webhook] Update result - data:", data, "error:", error);

  if (error) {
    console.error("[Stripe Webhook] Error updating subscription:", error);
    throw error;
  }

  // usageテーブルの上限も更新
  const period = new Date().toISOString().slice(0, 7);
  await supabase
    .from("usage")
    .update({
      minutes_limit: planConfig.minutes,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("period", period);

  console.log("[Stripe Webhook] Subscription activated for user:", userId);
}

/**
 * サブスクリプション更新時の処理
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscription: any
) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error("[Stripe Webhook] Missing user_id in subscription metadata");
    return;
  }

  // Price IDからプランを特定
  const priceId = subscription.items.data[0]?.price.id;
  let plan: "free" | "light" | "standard" | "premium" = "free";

  if (priceId === STRIPE_PLANS.light.priceId) {
    plan = "light";
  } else if (priceId === STRIPE_PLANS.standard.priceId) {
    plan = "standard";
  } else if (priceId === STRIPE_PLANS.premium.priceId) {
    plan = "premium";
  }

  const status = subscription.status === "active" ? "active" :
                 subscription.status === "past_due" ? "past_due" : "canceled";

  // current_period_endを安全に変換
  console.log("[Stripe Webhook] Raw current_period_end:", subscription.current_period_end, "type:", typeof subscription.current_period_end);
  console.log("[Stripe Webhook] Raw cancel_at:", subscription.cancel_at, "type:", typeof subscription.cancel_at);

  let currentPeriodEnd: string | null = null;
  // Stripeからの値を確認（numberまたはstring）
  const periodEndValue = subscription.current_period_end || subscription.cancel_at;
  if (periodEndValue) {
    const timestamp = typeof periodEndValue === 'number' ? periodEndValue : parseInt(periodEndValue as string, 10);
    if (!isNaN(timestamp)) {
      currentPeriodEnd = new Date(timestamp * 1000).toISOString();
    }
  }

  console.log("[Stripe Webhook] Subscription updated for user:", userId, "plan:", plan, "status:", status, "cancel_at_period_end:", subscription.cancel_at_period_end, "currentPeriodEnd:", currentPeriodEnd);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan: plan,
      status: status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[Stripe Webhook] Error updating subscription:", error);
    throw error;
  }

  // usageテーブルの上限も更新
  const planConfig = plan === "free" ? { minutes: 60 } : STRIPE_PLANS[plan];
  const period = new Date().toISOString().slice(0, 7);
  await supabase
    .from("usage")
    .update({
      minutes_limit: planConfig.minutes,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("period", period);
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscription: any
) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error("[Stripe Webhook] Missing user_id in subscription metadata");
    return;
  }

  console.log("[Stripe Webhook] Subscription deleted for user:", userId);

  // Freeプランに戻す
  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      scheduled_plan: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[Stripe Webhook] Error updating subscription:", error);
    throw error;
  }

  // usageテーブルの上限をFreeに
  const period = new Date().toISOString().slice(0, 7);
  await supabase
    .from("usage")
    .update({
      minutes_limit: 60, // Free: 1時間
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("period", period);
}

/**
 * 支払い失敗時の処理
 * 仕様: 即時Freeプランに降格 + メール通知
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;

  // Customer IDからユーザーを特定
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!subscriptionData) {
    console.error("[Stripe Webhook] No subscription found for customer:", customerId);
    return;
  }

  const userId = subscriptionData.user_id;
  console.log("[Stripe Webhook] Payment failed for user:", userId);

  // 即時Freeプランに降格
  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      scheduled_plan: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("[Stripe Webhook] Error updating subscription status:", error);
    throw error;
  }

  // usageテーブルの上限もFreeに更新
  const period = new Date().toISOString().slice(0, 7);
  await supabase
    .from("usage")
    .update({
      minutes_limit: 60, // Free: 1時間
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("period", period);

  // ユーザー情報を取得してメール送信
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  // Supabase Authからメールアドレスを取得
  const { data: authData } = await supabase.auth.admin.getUserById(userId);
  const userEmail = authData?.user?.email;

  if (userEmail) {
    const emailContent = paymentFailedEmail(profile?.display_name);
    const sent = await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (sent) {
      console.log("[Stripe Webhook] Payment failed email sent to:", userEmail);
    } else {
      console.error("[Stripe Webhook] Failed to send payment failed email to:", userEmail);
    }
  } else {
    console.error("[Stripe Webhook] No email found for user:", userId);
  }

  console.log("[Stripe Webhook] User downgraded to Free plan due to payment failure:", userId);
}

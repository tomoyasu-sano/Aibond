/**
 * Stripe Checkout セッション作成API
 *
 * POST /api/stripe/checkout - チェックアウトセッション作成
 */

import { createClient } from "@/lib/supabase/server";
import { getStripe, STRIPE_PLANS, type StripePlanKey } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { plan } = body as { plan: StripePlanKey };

    if (!plan || !STRIPE_PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planConfig = STRIPE_PLANS[plan];
    if (!planConfig.priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    const stripe = getStripe();

    // 既存のStripe Customerを取得または作成
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Stripe Customerを作成
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // subscriptionsテーブルを更新
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // Checkoutセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/settings?checkout=success`,
      cancel_url: `${request.nextUrl.origin}/plans?checkout=canceled`,
      metadata: {
        user_id: user.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

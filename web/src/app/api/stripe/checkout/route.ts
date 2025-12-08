/**
 * Stripe Checkout セッション作成API
 *
 * POST /api/stripe/checkout - チェックアウトセッション作成
 */

import { createClient } from "@/lib/supabase/server";
import { getStripe, STRIPE_PLANS, type StripePlanKey } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Stripeがサポートする言語コードへのマッピング
function getStripeLocale(locale: string): 'ja' | 'en' | 'auto' {
  if (locale === 'ja') return 'ja';
  if (locale === 'en') return 'en';
  return 'auto';
}

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
    const { plan, locale: clientLocale } = body as { plan: StripePlanKey; locale?: string };

    // Cookie から言語設定を取得（フォールバック）
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    const locale = getStripeLocale(clientLocale || cookieLocale || 'ja');

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
      locale: locale,
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/settings?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/plans?checkout=canceled`,
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

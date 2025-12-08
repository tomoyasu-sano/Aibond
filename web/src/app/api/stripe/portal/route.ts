/**
 * Stripe Customer Portal セッション作成API
 *
 * POST /api/stripe/portal - ポータルセッション作成（プラン変更・キャンセル用）
 */

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
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
    // Stripe Customer IDを取得
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const stripe = getStripe();

    // Cookie から言語設定を取得
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    const locale = getStripeLocale(cookieLocale || 'ja');

    // Customer Portalセッションを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/settings`,
      locale: locale,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe Portal] Error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}

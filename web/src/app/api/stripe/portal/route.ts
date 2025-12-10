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

    const stripe = getStripe();
    let customerId = subscription?.stripe_customer_id;

    // Customer IDがない場合は、既存のCustomerを検索または新規作成
    if (!customerId) {
      console.log("[Stripe Portal] No customer ID found, searching or creating customer");

      // メールアドレスでCustomerを検索
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        // 既存のCustomerが見つかった
        customerId = customers.data[0].id;
        console.log("[Stripe Portal] Found existing customer:", customerId);
      } else {
        // 新しいCustomerを作成
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id,
          },
        });
        customerId = customer.id;
        console.log("[Stripe Portal] Created new customer:", customerId);
      }

      // データベースを更新
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // Cookie から言語設定を取得
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    const locale = getStripeLocale(cookieLocale || 'ja');

    // Customer Portalセッションを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
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

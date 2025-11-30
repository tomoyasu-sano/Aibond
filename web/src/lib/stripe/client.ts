/**
 * Stripe クライアント
 */

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2025-11-17.clover",
    typescript: true,
  });

  return stripeInstance;
}

/**
 * プラン設定
 */
export const STRIPE_PLANS = {
  standard: {
    priceId: process.env.STRIPE_PRICE_STANDARD || "",
    name: "スタンダード",
    price: 1980,
    minutes: 900, // 15時間 = 900分
  },
  premium: {
    priceId: process.env.STRIPE_PRICE_PREMIUM || "",
    name: "プレミアム",
    price: 2980,
    minutes: 2400, // 40時間 = 2400分
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PLANS;

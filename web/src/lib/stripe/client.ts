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
  light: {
    priceId: process.env.STRIPE_PRICE_LIGHT || "",
    name: "ライト",
    price: 1280,
    minutes: 300, // 5時間 = 300分
  },
  standard: {
    priceId: process.env.STRIPE_PRICE_STANDARD || "",
    name: "スタンダード",
    price: 1980,
    minutes: 600, // 10時間 = 600分
  },
  premium: {
    priceId: process.env.STRIPE_PRICE_PREMIUM || "",
    name: "プレミアム",
    price: 2980,
    minutes: 1500, // 25時間 = 1500分
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PLANS;

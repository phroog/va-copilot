import Stripe from "stripe";

/* Central plan configuration — swap the payment provider here later without
   touching the plan/limit logic. */
export const PLANS = {
  free: { dailyJobLimit: 20, monthlyCredits: 5, label: "Free", priceId: null as string | null },
  basic: { dailyJobLimit: 100, monthlyCredits: 50, label: "Basic", priceId: (process.env.STRIPE_PRICE_BASIC || "") as string },
  pro: { dailyJobLimit: null, monthlyCredits: 200, label: "Pro", priceId: (process.env.STRIPE_PRICE_PRO || "") as string },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function planFromPriceId(priceId: string | null | undefined): PlanKey {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_BASIC) return "basic";
  return "basic";
}

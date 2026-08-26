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

/* Swap allowance per plan — generous, but capped so it can't be farmed. */
export const SWAP_LIMITS: Record<PlanKey, number> = { free: 3, basic: 10, pro: 30 };

/* Minimum match score for a job to count against the matched daily quota. */
export const MATCH_THRESHOLD = 50;

/* Daily random bonus of extra job views, per user (5-20). */
export function dailyBonus(): number {
  return 5 + Math.floor(Math.random() * 16);
}

export type WheelReward = { type: "views" | "credits"; amount: number; label: string };

const WHEEL_SEGMENTS: { type: WheelReward["type"]; amount: number; label: string; weight: number }[] = [
  { type: "views", amount: 5, label: "+5 Job Views", weight: 25 },
  { type: "views", amount: 10, label: "+10 Job Views", weight: 20 },
  { type: "views", amount: 20, label: "+20 Job Views", weight: 10 },
  { type: "credits", amount: 1, label: "+1 Credit", weight: 20 },
  { type: "credits", amount: 2, label: "+2 Credits", weight: 15 },
  { type: "credits", amount: 5, label: "+5 Credits", weight: 10 },
];

export function spinWheel(): WheelReward {
  const total = WHEEL_SEGMENTS.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * total;
  for (const seg of WHEEL_SEGMENTS) {
    roll -= seg.weight;
    if (roll <= 0) return { type: seg.type, amount: seg.amount, label: seg.label };
  }
  return { type: "views", amount: 5, label: "+5 Job Views" };
}

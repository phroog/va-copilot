import Stripe from "stripe";

/* Central plan configuration — swap the payment provider here later without
   touching the plan/limit logic. */
export const PLANS = {
  free: { dailyJobLimit: 20, monthlyCredits: 5, label: "Sari Sprout", priceId: null as string | null },
  basic: { dailyJobLimit: 100, monthlyCredits: 50, label: "Sari Bloom", priceId: (process.env.STRIPE_PRICE_BASIC || "") as string },
  pro: { dailyJobLimit: null, monthlyCredits: 200, label: "Sari Money Club", priceId: (process.env.STRIPE_PRICE_PRO || "") as string },
} as const;

export type PlanKey = keyof typeof PLANS;

/* One-time access passes (1 or 3 months) — payable with PayPal (which Stripe
   can't use for recurring subscriptions). Temporary until PayPal subscriptions
   are approved. */
export type PassKey = "basic_1m" | "basic_3m" | "pro_1m" | "pro_3m";

export interface Pass {
  plan: PlanKey;
  months: number;
  priceId: string;
  amountUsd: number;
  label: string;
}

export const PASSES: Record<PassKey, Pass> = {
  basic_1m: { plan: "basic", months: 1, priceId: "price_1UCcmfQtDRGVAHQg7eKX3NRE", amountUsd: 4.99, label: "Sari Bloom · 1 month" },
  basic_3m: { plan: "basic", months: 3, priceId: "price_1UCcmfQtDRGVAHQgjVNBkLbh", amountUsd: 11.99, label: "Sari Bloom · 3 months" },
  pro_1m: { plan: "pro", months: 1, priceId: "price_1UCcmfQtDRGVAHQgHs4wWCdE", amountUsd: 9.99, label: "Sari Money Club · 1 month" },
  pro_3m: { plan: "pro", months: 3, priceId: "price_1UCcmgQtDRGVAHQg5r1wizsT", amountUsd: 23.99, label: "Sari Money Club · 3 months" },
};

/* Grace period after a subscription ends before the user drops back to free. */
export const GRACE_DAYS = 2;

/* Compute the plan the user should effectively have, honouring the grace
   period: after cancellation the plan stays active until access_until passes. */
export function effectivePlan(sub?: {
  plan?: string | null;
  status?: string | null;
  access_until?: string | null;
} | null): PlanKey {
  if (!sub || !sub.plan || sub.plan === "free") return "free";
  if (sub.status === "active") return sub.plan as PlanKey;
  if (sub.access_until) {
    const until = new Date(sub.access_until).getTime();
    if (until > Date.now()) return sub.plan as PlanKey; // grace period
  }
  return "free";
}

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

/* Swap allowance per plan — generous, but capped so it can't be farmed.
   Money Club (pro) has unlimited job access, so no swap cap there. */
export const SWAP_LIMITS: Record<PlanKey, number | null> = { free: 3, basic: 10, pro: null };

/* Plans that get FULL access to the scam registry (Sprout = free gets a teaser).
   Change this single constant to adjust the gating. */
export const SCAM_REGISTRY_FULL_PLANS: PlanKey[] = ["basic", "pro"];

/* Minimum match score for a job to be clickable in best/newest (browse gate). */
export const MATCH_THRESHOLD = 50;

/* Minimum match score for a job to be auto-granted into My Matches. Deliberately
   higher than MATCH_THRESHOLD so only jobs we're really confident about end up
   in the user's matched list. */
export const AUTO_GRANT_THRESHOLD = 75;

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

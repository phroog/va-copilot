import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST /api/subscription/cancel
 * Cancels the active subscription at the end of the current billing period
 * (Stripe cancel_at_period_end). The user keeps access until the period ends,
 * plus a grace period (see effectivePlan). It does NOT refund or instantly
 * downgrade.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Payment is not configured" }, { status: 500 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: "No active subscription to cancel" }, { status: 404 });
  }
  if (sub.status !== "active") {
    return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
  }

  await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });

  return NextResponse.json({ ok: true, cancelsAtPeriodEnd: true });
}
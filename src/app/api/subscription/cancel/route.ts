import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/payments";
import { sendEmail, layoutEmail } from "@/lib/email";

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
    .select("stripe_subscription_id, plan, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: "No active subscription to cancel" }, { status: 404 });
  }
  if (sub.status !== "active") {
    return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
  }

  await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });

  // Transactional confirmation email.
  if (user.email) {
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString()
      : "the end of the billing period";
    await sendEmail({
      to: user.email,
      subject: "Your Sari subscription will not renew",
      html: layoutEmail(
        "Subscription cancelled",
        `<p>We've turned off automatic renewal for your Sari subscription.</p>
         <p>You keep full access until <b>${periodEnd}</b> (plus a short grace period after that).</p>
         <p>You can resubscribe at any time from the <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://va-copilot-theta.vercel.app"}/pricing">pricing page</a>.</p>`
      ),
    });
  }

  return NextResponse.json({ ok: true, cancelsAtPeriodEnd: true });
}
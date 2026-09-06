import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStripe, PLANS, GRACE_DAYS, planFromPriceId, PASSES, type PlanKey, type PassKey } from "@/lib/payments";
import { sendEmail, layoutEmail } from "@/lib/email";
import { metaPurchase } from "@/lib/meta-capi";

export const runtime = "nodejs";

const supabase = () => createServiceRoleClient();

async function upsertSubscription(
  userId: string,
  plan: PlanKey,
  status: string,
  stripeSubscriptionId: string | null,
  currentPeriodEnd: number | null
) {
  const payload: Record<string, any> = {
    user_id: userId,
    plan,
    status,
    stripe_subscription_id: stripeSubscriptionId,
    current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
  };
  // A (re)activated subscription clears the grace-period cutoff.
  if (status === "active") payload.access_until = null;
  await supabase().from("subscriptions").upsert(payload, { onConflict: "user_id" });

  // Reflect the plan limits on the profile for quick reads.
  const limit = PLANS[plan].dailyJobLimit ?? 20;
  await supabase().from("profiles").update({
    daily_job_limit: limit,
    monthly_ai_credits: PLANS[plan].monthlyCredits,
  }).eq("user_id", userId);
}

async function awardCredits(userId: string, plan: PlanKey) {
  const credits = PLANS[plan].monthlyCredits;
  const { data: row } = await supabase().from("ai_credits").select("balance").eq("user_id", userId).maybeSingle();
  const current = row?.balance ?? 0;
  // Set to at least the awarded amount (top up on renewal).
  const balance = Math.max(current, credits);
  await supabase().from("ai_credits").upsert({ user_id: userId, balance, total_used: 0 }, { onConflict: "user_id" });
}

/* One-time pass purchase: grant access for N months (no recurring billing). */
async function applyPass(userId: string, passKey: PassKey) {
  const pass = PASSES[passKey];
  if (!pass) return;
  const until = new Date();
  until.setMonth(until.getMonth() + pass.months);
  const untilIso = until.toISOString();

  await supabase().from("subscriptions").upsert({
    user_id: userId,
    plan: pass.plan,
    status: "pass",
    stripe_subscription_id: null,
    current_period_end: untilIso,
    access_until: untilIso,
  }, { onConflict: "user_id" });

  const limit = PLANS[pass.plan].dailyJobLimit ?? 20;
  await supabase().from("profiles").update({
    daily_job_limit: limit,
    monthly_ai_credits: PLANS[pass.plan].monthlyCredits,
  }).eq("user_id", userId);

  await awardCredits(userId, pass.plan);
}

/* Subscription ended: keep the plan for the grace period so the user doesn't
   lose access immediately, then it falls back to free automatically. */
async function startGracePeriod(stripeSubscriptionId: string) {
  const { data: row } = await supabase()
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (!row) return;
  const graceUntil = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase()
    .from("subscriptions")
    .update({ status: "cancelled", access_until: graceUntil })
    .eq("user_id", row.user_id);

  // Inform the user their access is ending soon (grace period is running).
  const { data: authUser } = await supabase().auth.admin.getUserById(row.user_id);
  const email = authUser?.user?.email;
  if (email) {
    const until = new Date(graceUntil).toLocaleDateString();
    await sendEmail({
      to: email,
      subject: "Your Sari access ends soon",
      html: layoutEmail(
        "Access ending",
        `<p>Your Sari subscription has ended. As a courtesy you keep access until <b>${until}</b> (grace period).</p>
         <p>After that you'll continue on the free <b>Sari Sprout</b> plan — you can resubscribe at any time on the
         <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://va-copilot-theta.vercel.app"}/pricing">pricing page</a>.</p>`
      ),
    });
  }
}

/**
 * POST /api/stripe-webhook  (public)
 * Verifies the Stripe signature and updates subscriptions + credits.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(raw, sig as string, secret);
  } catch (err: any) {
    return NextResponse.json({ error: "Webhook signature verification failed: " + err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const userId = s.client_reference_id;
        if (!userId) break;

        // One-time pass checkout (supports PayPal).
        if (s.mode === "payment" && s.metadata?.pass) {
          await applyPass(userId, s.metadata.pass as PassKey);
          const { data: passUser } = await supabase().auth.admin.getUserById(userId);
          const passEmail = passUser?.user?.email || null;
          const passAmount = s.amount_total ? s.amount_total / 100 : undefined;
          const passCurrency = s.currency ? s.currency.toUpperCase() : undefined;
          await metaPurchase({ email: passEmail, value: passAmount, currency: passCurrency }).catch(() => {});
          break;
        }

        const plan = (s.metadata?.plan || planFromPriceId(s.items?.data?.[0]?.price?.id)) as PlanKey;
        await upsertSubscription(userId, plan, "active", s.subscription, s.current_period_end);
        await awardCredits(userId, plan);
        // The Dream Streak free month is consumed by this checkout.
        if (s.metadata?.freeMonth === "1") {
          await supabase().from("profiles").update({ free_month_available: false }).eq("user_id", userId);
        }
        // Server-side Meta CAPI Purchase conversion.
        const { data: authUser } = await supabase().auth.admin.getUserById(userId);
        const email = authUser?.user?.email || null;
        const amount = s.amount_total ? s.amount_total / 100 : undefined;
        const currency = s.currency ? s.currency.toUpperCase() : undefined;
        await metaPurchase({ email, value: amount, currency }).catch(() => {});
        break;
      }
      case "customer.subscription.updated": {
        const s = event.data.object;
        const plan = planFromPriceId(s.items?.data?.[0]?.price?.id);
        const status = s.status === "active" ? "active" : s.status === "past_due" ? "past_due" : "cancelled";
        const { data: row } = await supabase().from("subscriptions").select("user_id").eq("stripe_subscription_id", s.id).maybeSingle();
        if (row) {
          await upsertSubscription(row.user_id, plan, status, s.id, s.current_period_end);
          if (status === "active") await awardCredits(row.user_id, plan);
        }
        break;
      }
      case "customer.subscription.deleted": {
        await startGracePeriod(event.data.object.id);
        break;
      }
      case "invoice.paid": {
        const s = event.data.object;
        if (s.subscription) {
          const sub = s.subscription;
          const { data: row } = await supabase().from("subscriptions").select("user_id").eq("stripe_subscription_id", sub).maybeSingle();
          if (row) {
            const plan = planFromPriceId(s.lines?.data?.[0]?.price?.id);
            await upsertSubscription(row.user_id, plan, "active", sub, s.period_end);
            await awardCredits(row.user_id, plan);
          }
        }
        break;
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
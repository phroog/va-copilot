import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getStripe, PLANS, planFromPriceId, type PlanKey } from "@/lib/payments";

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

async function resetToFree(stripeSubscriptionId: string) {
  const { data: row } = await supabase()
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (!row) return;
  await supabase().from("subscriptions").update({ plan: "free", status: "cancelled", stripe_subscription_id: null }).eq("user_id", row.user_id);
  await supabase().from("profiles").update({ daily_job_limit: 20, monthly_ai_credits: 5 }).eq("user_id", row.user_id);
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
        const plan = (s.metadata?.plan || planFromPriceId(s.items?.data?.[0]?.price?.id)) as PlanKey;
        if (userId) {
          await upsertSubscription(userId, plan, "active", s.subscription, s.current_period_end);
          await awardCredits(userId, plan);
        }
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
        await resetToFree(event.data.object.id);
        break;
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
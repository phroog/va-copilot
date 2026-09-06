import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, effectivePlan, type PlanKey } from "@/lib/payments";

/**
 * GET /api/subscription-status
 * Authenticated: current effective plan (honouring the grace period), status,
 * daily limits, monthly credits, and the credits + usage balance.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [subRes, creditsRes, profileRes, viewsRes] = await Promise.all([
    supabase.from("subscriptions").select("plan, status, current_period_end, access_until").eq("user_id", user.id).maybeSingle(),
    supabase.from("ai_credits").select("balance, total_used").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("daily_job_limit, monthly_ai_credits").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_job_views").select("count").eq("user_id", user.id).eq("view_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
  ]);

  const rawPlan = ((subRes.data?.plan as PlanKey) || "free");
  const plan = effectivePlan(subRes.data);
  const status = subRes.data?.status || "active";
  const isPass = status === "pass";
  const accessUntil = subRes.data?.access_until || null;
  const dailyJobLimit = PLANS[plan].dailyJobLimit;
  const usedToday = viewsRes.data?.count ?? 0;
  const inGrace = plan !== "free" && rawPlan === plan && accessUntil != null;

  return NextResponse.json({
    plan,
    planLabel: PLANS[plan].label,
    rawPlan,
    status,
    isPass,
    inGrace,
    accessUntil,
    periodEnd: subRes.data?.current_period_end ?? null,
    dailyJobLimit,
    usedToday,
    monthlyCredits: PLANS[plan].monthlyCredits,
    profileDailyLimit: profileRes.data?.daily_job_limit ?? 20,
    credits: creditsRes.data?.balance ?? 0,
    creditsUsed: creditsRes.data?.total_used ?? 0,
  });
}
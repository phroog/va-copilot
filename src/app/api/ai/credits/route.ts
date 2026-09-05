import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, effectivePlan } from "@/lib/payments";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: credits } = await supabase
    .from("ai_credits")
    .select("balance, total_used")
    .eq("user_id", user.id)
    .maybeSingle();

  // First time a user loads their credits: grant the plan's monthly allowance
  // (free = 5 credits). Paid users get topped up by the Stripe webhook instead.
  if (!credits) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, status, access_until")
      .eq("user_id", user.id)
      .maybeSingle();
    const plan = effectivePlan(sub);
    const initial = PLANS[plan].monthlyCredits;
    await supabase.from("ai_credits").insert({
      user_id: user.id,
      balance: initial,
      total_used: 0,
    });
    return NextResponse.json({ balance: initial, total_used: 0 });
  }

  return NextResponse.json({
    balance: credits.balance ?? 0,
    total_used: credits.total_used ?? 0,
  });
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("ai_credits")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("ai_credits")
      .update({ balance: 100 })
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("ai_credits").insert({
      user_id: user.id,
      balance: 100,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, balance: 100 });
}

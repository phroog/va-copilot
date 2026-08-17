import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spinWheel } from "@/lib/payments";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * GET /api/wheel  → { spunToday, reward, canSpin }
 * POST /api/wheel → spins once per day, applies the reward to views or credits.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: spin } = await supabase
    .from("user_wheel_spins")
    .select("reward")
    .eq("user_id", user.id)
    .eq("spin_date", todayISO())
    .maybeSingle();

  return NextResponse.json({
    spunToday: !!spin,
    reward: spin?.reward ?? null,
    canSpin: !spin,
  });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = todayISO();

  const { data: existing } = await supabase
    .from("user_wheel_spins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("spin_date", today)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "Schon heute gedreht – morgen wieder!" }, { status: 429 });

  const reward = spinWheel();

  if (reward.type === "views") {
    const { data: view } = await supabase
      .from("user_job_views")
      .select("count, swaps, bonus")
      .eq("user_id", user.id)
      .eq("view_date", today)
      .maybeSingle();
    const count = view?.count ?? 0;
    const swaps = view?.swaps ?? 0;
    const bonus = (view?.bonus ?? 0) + reward.amount;
    await supabase.from("user_job_views").upsert(
      { user_id: user.id, view_date: today, count, swaps, bonus },
      { onConflict: "user_id,view_date" }
    );
  } else {
    const { data: credits } = await supabase
      .from("ai_credits")
      .select("balance, total_used")
      .eq("user_id", user.id)
      .maybeSingle();
    const balance = (credits?.balance ?? 0) + reward.amount;
    const total_used = credits?.total_used ?? 0;
    await supabase.from("ai_credits").upsert(
      { user_id: user.id, balance, total_used },
      { onConflict: "user_id" }
    );
  }

  await supabase.from("user_wheel_spins").insert({
    user_id: user.id,
    spin_date: today,
    reward,
  });

  return NextResponse.json({ ok: true, reward, spunToday: true });
}
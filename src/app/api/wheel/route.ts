import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spinWheel } from "@/lib/payments";
import { ensureProfile } from "@/lib/learn/profile";
import { grantBonusLessons } from "@/lib/learn/energy";

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
  if (existing) return NextResponse.json({ error: "Already spun today – try again tomorrow!" }, { status: 429 });

  const reward = spinWheel();

  if (reward.type === "lessons") {
    // Daily Energy: extra lesson slots for today.
    await grantBonusLessons(supabase, user.id, reward.amount);
  } else {
    // XP straight to the profile.
    const profile = await ensureProfile(supabase, user.id);
    const { data: cur } = await supabase.from("profiles").select("xp").eq("user_id", user.id).maybeSingle();
    await supabase.from("profiles").update({ xp: (cur?.xp ?? profile?.xp ?? 0) + reward.amount }).eq("user_id", user.id);
  }

  await supabase.from("user_wheel_spins").insert({
    user_id: user.id,
    spin_date: today,
    reward,
  });

  return NextResponse.json({ ok: true, reward, spunToday: true });
}
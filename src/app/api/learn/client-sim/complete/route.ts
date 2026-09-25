import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp } from "@/lib/learn/ranks";
import { ensureProfile } from "@/lib/learn/profile";
import { ensureDaily, getEnergy, consumeSimScenarios } from "@/lib/learn/energy";
import { XP_SCALE } from "@/lib/learn/ranks";

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const xpRaw = clamp(Math.round(Number(body.xp_earned) || 0), 0, 2000 * XP_SCALE);
  const rounds = clamp(Math.round(Number(body.rounds) || 0), 0, 200);
  const correct = clamp(Math.round(Number(body.correct) || 0), 0, rounds);
  const bestStreak = clamp(Math.round(Number(body.best_streak) || 0), 0, 999);

  // Daily Energy: BLOOM gets 5 scenarios/day, Money Club unlimited.
  await ensureDaily(supabase, user.id);
  const energy = await getEnergy(supabase, user.id);
  if (energy.simLimit !== Infinity && rounds > energy.simLeft) {
    return NextResponse.json({ error: "Out of sim scenarios today", energy }, { status: 429 });
  }
  await consumeSimScenarios(supabase, user.id, rounds);

  const profile = await ensureProfile(supabase, user.id);
  const beforeXp = profile?.xp ?? 0;
  const newXp = beforeXp + xpRaw;
  if (xpRaw > 0) {
    await supabase.from("profiles").update({ xp: newXp }).eq("user_id", user.id);
  }

  // Streak: bump if this is the first activity today (grinding counts).
  let streak = profile?.streak_count ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const lastActive = profile?.last_active_date ?? null;
  if (lastActive !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    streak = lastActive === yesterday ? streak + 1 : 1;
    await supabase.from("profiles").update({ streak_count: streak, last_active_date: today }).eq("user_id", user.id);
  }

  const before = summarizeXp(beforeXp);
  const after = summarizeXp(newXp);
  const rankUp =
    after.rankTitle !== before.rankTitle || after.level !== before.level
      ? { from: before.rankTitle, to: after.rankTitle, levelBefore: before.level, levelAfter: after.level }
      : null;

  return NextResponse.json({
    xp_earned: xpRaw,
    rounds,
    correct,
    bestStreak,
    rankUp,
    user: { ...after, streak },
  });
}
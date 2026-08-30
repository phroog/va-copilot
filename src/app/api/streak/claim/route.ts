import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STREAK_MILESTONES, claimedSet } from "@/lib/streak";

export const runtime = "nodejs";

/**
 * POST /api/streak/claim  { milestone }
 * Claims a milestone reward once the streak reaches it. Grants credits or
 * (at 90 days) marks a free Money Club month as available.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { milestone?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const milestone = STREAK_MILESTONES.find((m) => m.days === body.milestone);
  if (!milestone) return NextResponse.json({ error: "Invalid milestone" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_count, streak_claimed, free_month_available")
    .eq("user_id", user.id)
    .maybeSingle();

  if ((profile?.streak_count ?? 0) < milestone.days) {
    return NextResponse.json({ error: "Streak not high enough yet" }, { status: 400 });
  }
  const claimed = claimedSet(profile?.streak_claimed);
  if (claimed.has(String(milestone.days))) {
    return NextResponse.json({ error: "Already claimed" }, { status: 400 });
  }

  const claimedArr = Array.isArray(profile?.streak_claimed) ? profile.streak_claimed : [];
  claimedArr.push({ days: milestone.days });

  let reward: string;
  if (milestone.freeMonth) {
    await supabase.from("profiles").update({
      streak_claimed: claimedArr,
      free_month_available: true,
    }).eq("user_id", user.id);
    reward = "1 month of Money Club free";
  } else {
    const credits = milestone.credits ?? 0;
    const { data: creditsRow } = await supabase.from("ai_credits").select("balance").eq("user_id", user.id).maybeSingle();
    const balance = (creditsRow?.balance ?? 0) + credits;
    await supabase.from("ai_credits").upsert({ user_id: user.id, balance, total_used: 0 }, { onConflict: "user_id" });
    await supabase.from("profiles").update({ streak_claimed: claimedArr }).eq("user_id", user.id);
    reward = `+${credits} credits`;
  }

  return NextResponse.json({ ok: true, reward });
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STREAK_MILESTONES, currentMilestone, nextMilestone, claimedSet } from "@/lib/streak";

export const runtime = "nodejs";

const day = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

/**
 * POST /api/streak/ping
 * Call once per day (e.g. on dashboard load). Advances or resets the streak and
 * returns the current streak + milestone info.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_count, last_active_date, streak_claimed, free_month_available")
    .eq("user_id", user.id)
    .maybeSingle();

  const today = day();
  const last = profile?.last_active_date ? String(profile.last_active_date) : null;
  const prev = profile?.streak_count ?? 0;

  let streak = prev;
  if (last === today) {
    // already counted today
  } else if (last === daysAgo(1)) {
    streak = prev + 1;
  } else {
    streak = 1; // missed a day — streak resets
  }

  await supabase.from("profiles").update({ streak_count: streak, last_active_date: today }).eq("user_id", user.id);

  return NextResponse.json({
    streak,
    today,
    currentMilestone: currentMilestone(streak),
    next: nextMilestone(streak),
    claimed: Array.from(claimedSet(profile?.streak_claimed)),
    freeMonthAvailable: !!profile?.free_month_available,
    milestones: STREAK_MILESTONES,
  });
}
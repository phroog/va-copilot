import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { scamScore } from "@/lib/jobs/scam-score";

export const runtime = "nodejs";

/* GET /api/live-stats
 * Real, live numbers for the onboarding "wow" moment: how many jobs we
 * scanned in the last hour/day, how many scams we flagged, and a few of the
 * newest jobs to show as a live feed. Public aggregate data (no user data). */
export async function GET() {
  const supabase = createServiceRoleClient();
  const now = Date.now();
  const hourAgo = new Date(now - 3600 * 1000).toISOString();
  const dayAgo = new Date(now - 86400 * 1000).toISOString();

  const [hourRes, dayRes, totalRes, recentRes, scamPoolRes] = await Promise.all([
    supabase.from("global_jobs").select("id", { count: "exact", head: true }).gt("collected_at", hourAgo),
    supabase.from("global_jobs").select("id", { count: "exact", head: true }).gt("collected_at", dayAgo),
    supabase.from("global_jobs").select("id", { count: "exact", head: true }),
    supabase.from("global_jobs").select("id, title, platform, budget, collected_at").order("collected_at", { ascending: false }).limit(8),
    supabase.from("global_jobs").select("title, description, skills, platform, budget").gt("collected_at", dayAgo).order("collected_at", { ascending: false }).limit(1200),
  ]);

  const jobsLastHour = hourRes.count ?? 0;
  const jobsLast24h = dayRes.count ?? 0;
  const totalJobs = totalRes.count ?? 0;

  let scams = 0;
  for (const j of scamPoolRes.data ?? []) {
    const s = scamScore(j);
    if (s.risk >= 30) scams++; // yellow + orange + red = flagged as risky
  }

  const scamsPerHour = Math.max(1, Math.round(scams / 24));

  return NextResponse.json({
    jobs_last_hour: jobsLastHour,
    jobs_last_24h: jobsLast24h,
    total_jobs: totalJobs,
    scams_last_24h: scams,
    scams_per_hour: scamsPerHour,
    recent_jobs: recentRes.data ?? [],
  });
}

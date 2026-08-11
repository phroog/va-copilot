import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Private admin dashboard API. Stats are aggregated from the service-role
 * client (bypasses RLS) and gated behind the admin dashboard session cookie
 * (separate password, independent of the user auth system).
 */
export async function GET(request: Request) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  const ok = await verifyAdminSession(token, secret);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleClient();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStart = today.toISOString();
  const weekStart = new Date(now.getTime() - 7 * 864e5).toISOString();
  const hourAgo = new Date(now.getTime() - 3600e3).toISOString();

  // auth.admin.listUsers can be flaky in some setups — never let it kill the route.
  let authUserCount = 0;
  try {
    const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    authUserCount = (users.data as any)?.count ?? 0;
  } catch (e) {
    console.error("[admin/stats] listUsers failed:", (e as Error).message);
  }

  const [userCount, profiles, weekProfiles, sources, jobsTotal, jobsToday, jobsWeek, jobsHour, saved, applied, pitches, interactions, recentJobs] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("user_id, full_name, created_at"),
      supabase.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", weekStart),
      supabase.from("job_sources").select("*").order("name", { ascending: true }),
      supabase.from("global_jobs").select("*", { count: "exact", head: true }),
      supabase.from("global_jobs").select("*", { count: "exact", head: true }).gte("collected_at", dayStart),
      supabase.from("global_jobs").select("*", { count: "exact", head: true }).gte("collected_at", weekStart),
      supabase.from("global_jobs").select("*", { count: "exact", head: true }).gte("collected_at", hourAgo),
      supabase.from("user_job_interactions").select("global_job_id", { count: "exact", head: true }).eq("is_saved", true),
      supabase.from("user_job_interactions").select("global_job_id", { count: "exact", head: true }).eq("is_applied", true),
      supabase.from("pitches").select("*", { count: "exact", head: true }),
      supabase.from("user_job_interactions").select("*", { count: "exact", head: true }),
      supabase.from("global_jobs")
        .select("id, title, platform, url, client_name, posted_at, collected_at, budget")
        .order("collected_at", { ascending: false })
        .limit(60),
    ]);

  // Distinct user count = max of auth.users-stated total vs actual profiles.
  const distinctUsers = Math.max(authUserCount, userCount.count ?? 0);

  // Distinct users, jobs per platform (dedupe by platform value)
  const distinctProfiles = (profiles.data ?? []).length;
  // Known platform set from job_sources (not a sampled scan — exact).
  const distinctPlatforms = Array.from(
    new Set((sources.data ?? []).map((s: any) => s.platform).filter((p: any) => !!p))
  ) as string[];

  // Exact per-platform counts via head queries (global_jobs caps raw scans at 1000 rows).
  const platformRows = await Promise.all(
    distinctPlatforms.map((platform) =>
      supabase
        .from("global_jobs")
        .select("*", { count: "exact", head: true })
        .eq("platform", platform)
    )
  );
  const platformMap: Record<string, number> = {};
  distinctPlatforms.forEach((platform, i) => {
    platformMap[platform] = platformRows[i].count ?? 0;
  });
  const platformBreakdown = Object.entries(platformMap)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  // Sources with last collected age
  const sourcesWithAge = (sources.data ?? []).map((s: any) => ({
    ...s,
    last_collected_age_min: s.last_collected_at
      ? Math.round((now.getTime() - new Date(s.last_collected_at).getTime()) / 60000)
      : null,
  }));

  return NextResponse.json({
    generated_at: now.toISOString(),
    users: {
      total_users: distinctUsers,
      profiles: distinctProfiles,
      new_last_7d: weekProfiles.count ?? 0,
    },
    jobs: {
      total: jobsTotal.count ?? 0,
      today: jobsToday.count ?? 0,
      last_7d: jobsWeek.count ?? 0,
      last_hour: jobsHour.count ?? 0,
      per_platform: platformBreakdown,
    },
    sources: sourcesWithAge,
    activity: {
      saved_jobs: saved.count ?? 0,
      applied_jobs: applied.count ?? 0,
      total_pitches: pitches.count ?? 0,
      total_interactions: interactions.count ?? 0,
    },
    recent_jobs: recentJobs.data ?? [],
  });
}
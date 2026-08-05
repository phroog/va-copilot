import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeScore } from "@/lib/jobs/scoring";
import { upsertUserInteraction } from "@/lib/jobs/global";

/**
 * POST /api/jobs/calculate-score
 * Compute personalized matching scores for global jobs and store them on
 * the current user's interaction rows.
 * Body: { globalJobIds: string[] }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const ids: string[] = Array.isArray(body.globalJobIds) ? body.globalJobIds : Array.isArray(body.jobs) ? body.jobs : [];
  if (ids.length === 0) return NextResponse.json({ error: "globalJobIds is required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("skills, desired_rate, experience_level, job_categories")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found. Set up your skills in Settings first." }, { status: 404 });
  }

  const { data: jobs } = await supabase.from("global_jobs").select("*").in("id", ids);
  if (!jobs) return NextResponse.json({ error: "No jobs found" }, { status: 404 });

  const scored: any[] = [];
  for (const job of jobs) {
    const { score, match_reason } = computeScore(job, profile);
    try {
      await upsertUserInteraction(supabase, user.id, job.id, { matching_score: score });
    } catch (e) {
      console.error("Failed to store score:", e);
    }
    scored.push({ id: job.id, matching_score: score, match_reason });
  }

  return NextResponse.json({ jobs: scored });
}

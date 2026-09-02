import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyJobVector, matchVectors, validateUserVector, NEUTRAL_JOB_VECTOR, type Vector } from "@/lib/jobs/profile-vector";
import { scamScore } from "@/lib/jobs/scam-score";

/**
 * GET /api/jobs/global/[id]
 * Public-to-authenticated detail view of a live-feed job. Renders everything
 * stored about the job EXCEPT the original URL — the real link is released via
 * the reveal endpoint for 1 credit, so it can't be bypassed via the API.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: job, error } = await supabase.from("global_jobs").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const profileVector: Vector = Array.isArray(job.profile_vector) ? job.profile_vector : classifyJobVector(job).vector;
  const { data: profile } = await supabase
    .from("profiles")
    .select("job_vector")
    .eq("user_id", user.id)
    .maybeSingle();
  const userVec = profile?.job_vector ? validateUserVector(profile.job_vector) : NEUTRAL_JOB_VECTOR;
  const scam = scamScore(job);

  // Opening a job adds it to the user's My Matches collection.
  await supabase.from("user_opened_jobs").upsert(
    { user_id: user.id, global_job_id: job.id, opened_at: new Date().toISOString() },
    { onConflict: "user_id,global_job_id" }
  );

  return NextResponse.json({
    job: {
      ...job,
      profile_vector: profileVector,
      profile_match: userVec ? matchVectors(userVec, profileVector).score : null,
      scam_risk: scam.risk,
      scam_level: scam.level,
      scam_flags: scam.flags,
    },
  });
}
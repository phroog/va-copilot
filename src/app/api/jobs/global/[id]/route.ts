import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyJobVector, matchVectors, validateUserVector, type Vector } from "@/lib/jobs/profile-vector";
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
  const userVec = profile?.job_vector ? validateUserVector(profile.job_vector) : null;
  const scam = scamScore(job);

  // Free tier: everything except the full description and the URL — those are
  // unlocked together for 1 credit (fair + consistent across platforms).
  const { url: _url, detail: _detail, description: _desc, ...rest } = job;
  return NextResponse.json({
    job: {
      ...rest,
      description_preview: (job.detail?.description || job.description || "").slice(0, 300),
      profile_vector: profileVector,
      profile_match: userVec ? matchVectors(userVec, profileVector).score : null,
      scam_risk: scam.risk,
      scam_level: scam.level,
      scam_flags: scam.flags,
    },
  });
}
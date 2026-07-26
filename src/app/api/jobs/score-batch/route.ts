import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeScore } from "@/lib/jobs/scoring";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { jobs } = body;

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return NextResponse.json({ error: "Jobs array is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("skills, desired_rate, experience_level, job_categories")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found. Set up your skills in Settings first." }, { status: 404 });
  }

  const scored = jobs.map((job: Record<string, any>) => {
    const { score, match_reason } = computeScore(job, profile);
    return { ...job, score, match_reason };
  });

  return NextResponse.json({ jobs: scored });
}

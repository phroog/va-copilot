import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePitchForJob } from "@/lib/jobs/generate-pitch";
import { upsertUserInteraction } from "@/lib/jobs/global";

/**
 * POST /api/jobs/feed/pitch
 * Generate a pitch for a global feed job. Creates a local (user-scoped)
 * copy of the job so the existing pitches / follow-ups / milestones
 * infrastructure keeps working, then stores the pitch id on the
 * user's interaction row.
 * Body: { global_job_id, force? }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { global_job_id, force } = body;
  if (!global_job_id) return NextResponse.json({ error: "global_job_id is required" }, { status: 400 });

  const { data: globalJob, error: jobError } = await supabase
    .from("global_jobs")
    .select("*")
    .eq("id", global_job_id)
    .maybeSingle();

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!globalJob) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Ensure a local copy exists so pitches/follow-ups can reference a jobs.id.
  let localJob: any = null;
  if (globalJob.url) {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .eq("url", globalJob.url)
      .maybeSingle();
    localJob = data ?? null;
  }

  if (!localJob) {
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title: globalJob.title,
        platform: globalJob.platform ?? "Unknown",
        description: globalJob.description ?? "",
        budget: globalJob.budget ?? "",
        url: globalJob.url ?? "",
        skills: globalJob.skills ?? null,
        client_name: globalJob.client_name ?? null,
        client_country: globalJob.client_country ?? null,
        client_rating: globalJob.client_rating ?? null,
        posted_at: globalJob.posted_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    localJob = data;
  }

  try {
    const pitch = await generatePitchForJob(supabase, localJob, user.id, force);

    const { data: pitchRow } = await supabase
      .from("pitches")
      .select("id")
      .eq("job_id", localJob.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .maybeSingle();

    const interaction = await upsertUserInteraction(supabase, user.id, globalJob.id, {
      is_saved: true,
      pitch_id: pitchRow?.id ?? null,
    });

    return NextResponse.json({ pitch, local_job_id: localJob.id, interaction });
  } catch (e: any) {
    console.error("feed/pitch error:", e);
    return NextResponse.json({ error: e.message || "Failed to generate pitch" }, { status: e.status || 500 });
  }
}

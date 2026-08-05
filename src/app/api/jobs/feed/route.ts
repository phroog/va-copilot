import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CUTOFF_HOURS = 24;

/**
 * GET /api/jobs/feed
 * Returns the shared live feed joined with the current user's interactions
 * (is_saved, is_applied, matching_score, pitch_id). Defaults to false/null.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cutoff = new Date(Date.now() - CUTOFF_HOURS * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

  // Sources toggled off in Live Feed settings are hidden.
  const { data: excludedSources } = await supabase
    .from("job_sources")
    .select("id")
    .eq("include_in_live_feed", false);
  const excludedIds: string[] = (excludedSources ?? []).map((s: any) => s.id);

  const { data: interactions, error: intError } = await supabase
    .from("user_job_interactions")
    .select("*")
    .eq("user_id", user.id);

  if (intError) return NextResponse.json({ error: intError.message }, { status: 500 });

  const interactionMap = new Map<string, any>();
  const savedIds: string[] = [];
  for (const it of (interactions ?? [])) {
    interactionMap.set(it.global_job_id, it);
    if (it.is_saved || it.is_applied) savedIds.push(it.global_job_id);
  }

  let query = supabase.from("global_jobs").select("*");
  if (excludedIds.length > 0) {
    query = query.not("source_id", "in", `(${excludedIds.join(",")})`);
  }

  if (savedIds.length > 0) {
    query = query.or(`collected_at.gt.${cutoff},id.in.(${savedIds.join(",")})`);
  } else {
    query = query.gt("collected_at", cutoff);
  }

  const { data: jobs, error: jobsError } = await query.order("collected_at", { ascending: false }).limit(100);
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });

  const feed = (jobs ?? []).map((job: any) => {
    const it = interactionMap.get(job.id) ?? {};
    return {
      ...job,
      is_saved: it.is_saved ?? false,
      is_applied: it.is_applied ?? false,
      matching_score: it.matching_score ?? null,
      pitch_id: it.pitch_id ?? null,
    };
  });

  return NextResponse.json({ jobs: feed });
}

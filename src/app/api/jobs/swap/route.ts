import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SWAP_LIMITS, effectivePlan } from "@/lib/payments";

/**
 * POST /api/jobs/swap
 * Two-sided trade: the user gives up one of the jobs they own (from My Matches)
 * and acquires a feed job (from Best Match / Newest, incl. locked ones) in its
 * place. The owned job is removed from `user_opened_jobs`, the acquired job is
 * added, and both are marked `swapped` so neither is re-offered in the feed.
 *
 * Body: { give: string (owned job id), take: string (feed job id) }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let give: string | null = null;
  let take: string | null = null;
  try {
    const body = await request.json();
    give = typeof body?.give === "string" ? body.give : null;
    take = typeof body?.take === "string" ? body.take : null;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!give || !take) return NextResponse.json({ error: "Missing give/take job id" }, { status: 400 });
  if (give === take) return NextResponse.json({ error: "Cannot swap a job with itself" }, { status: 400 });

  const { data: jobs, error: jobsErr } = await supabase
    .from("global_jobs")
    .select("id")
    .in("id", [give, take]);
  if (jobsErr) return NextResponse.json({ error: jobsErr.message }, { status: 500 });
  if (!jobs || jobs.length < 2) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // The job being given away must currently be owned by the user (My Matches).
  const { data: owned } = await supabase
    .from("user_opened_jobs")
    .select("global_job_id")
    .eq("user_id", user.id)
    .eq("global_job_id", give)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "That job isn't in your My Matches" }, { status: 400 });

  const { data: sub } = await supabase.from("subscriptions").select("plan, status, access_until").eq("user_id", user.id).maybeSingle();
  const plan = effectivePlan(sub);
  const limit = SWAP_LIMITS[plan];
  const today = new Date().toISOString().slice(0, 10);

  const { data: view } = await supabase
    .from("user_job_views")
    .select("count, swaps, bonus")
    .eq("user_id", user.id)
    .eq("view_date", today)
    .maybeSingle();

  const swapUsed = view?.swaps ?? 0;
  if (limit != null && swapUsed >= limit) {
    return NextResponse.json({ error: "Swap limit for today reached" }, { status: 429 });
  }

  // Remove the given-away job, add the acquired job.
  await supabase.from("user_opened_jobs").delete().eq("user_id", user.id).eq("global_job_id", give);
  await supabase.from("user_opened_jobs").upsert(
    { user_id: user.id, global_job_id: take, opened_at: new Date().toISOString() },
    { onConflict: "user_id,global_job_id" }
  );

  // Mark both as swapped so they never re-appear in the raw feed.
  await supabase.from("user_job_interactions").upsert(
    [
      { user_id: user.id, global_job_id: give, swapped: true, is_saved: false, is_applied: false },
      { user_id: user.id, global_job_id: take, swapped: true },
    ],
    { onConflict: "user_id,global_job_id" }
  );

  const count = view?.count ?? 0;
  const bonus = view?.bonus ?? 0;
  await supabase.from("user_job_views").upsert(
    { user_id: user.id, view_date: today, count, swaps: swapUsed + 1, bonus },
    { onConflict: "user_id,view_date" }
  );

  return NextResponse.json({ ok: true, gave: give, took: take, remainingSwaps: limit != null ? limit - swapUsed - 1 : null, limit });
}

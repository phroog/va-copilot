import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, SWAP_LIMITS, type PlanKey } from "@/lib/payments";

/**
 * POST /api/jobs/[id]/swap
 * Trade a job that doesn't fit for a better-matched one. Generous per-day
 * allowance per plan (free 3 / basic 10 / pro 30) so it can't be farmed:
 * every swap marks the job as swapped (never re-offered) and spends one slot.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

  const { data: job, error: jobErr } = await supabase
    .from("global_jobs")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (jobErr || !job) return NextResponse.json({ error: "Job nicht gefunden" }, { status: 404 });

  const { data: sub } = await supabase.from("subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle();
  const plan = ((sub?.plan as PlanKey) || "free");
  const limit = SWAP_LIMITS[plan];
  const today = new Date().toISOString().slice(0, 10);

  const { data: view } = await supabase
    .from("user_job_views")
    .select("count, swaps, bonus")
    .eq("user_id", user.id)
    .eq("view_date", today)
    .maybeSingle();

  const swapUsed = view?.swaps ?? 0;
  if (swapUsed >= limit) {
    return NextResponse.json({ error: "Swap-Kontingent für heute aufgebraucht" }, { status: 429 });
  }

  await supabase.from("user_job_interactions").upsert(
    { user_id: user.id, global_job_id: id, swapped: true, is_saved: false, is_applied: false },
    { onConflict: "user_id,global_job_id" }
  );

  const count = view?.count ?? 0;
  const bonus = view?.bonus ?? 0;
  await supabase.from("user_job_views").upsert(
    { user_id: user.id, view_date: today, count, swaps: swapUsed + 1, bonus },
    { onConflict: "user_id,view_date" }
  );

  return NextResponse.json({ ok: true, swappedJobId: id, remainingSwaps: limit - swapUsed - 1, limit: SWAP_LIMITS[plan] });
}
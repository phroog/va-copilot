import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Deletes global_jobs that are older than the retention window and not saved
 * by any user (saved/applied jobs are kept forever). Prevents the feed table
 * from growing without bound. Protected by ADMIN_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hours = parseInt(new URL(request.url).searchParams.get("hours") || "72", 10);
  const cutoff = new Date(Date.now() - Math.max(1, hours) * 3600 * 1000).toISOString();

  const supabase = createServiceRoleClient();

  // Keep rows that any user has saved or applied to.
  const { data: kept } = await supabase
    .from("user_job_interactions")
    .select("global_job_id")
    .or("is_saved.eq.true,is_applied.eq.true");
  const keptIds: string[] = (kept ?? []).map((r: any) => r.global_job_id).filter(Boolean);

  let query = supabase.from("global_jobs").delete().lt("collected_at", cutoff);
  if (keptIds.length > 0) query = query.not("id", "in", `(${keptIds.join(",")})`);

  const { data, error } = await query.select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, removed: (data || []).length, cutoff, kept: keptIds.length });
}
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /api/jobs/global/missing-details?limit=N  (x-admin-secret)
 * Jobs that still lack enriched detail, newest first — the polling extension
 * backfills their detail pages in bounded batches.
 */
export async function GET(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get("limit") || "10", 10)));

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("global_jobs")
    .select("id, external_id, url")
    .is("detail", null)
    .not("url", "is", null)
    .order("collected_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}
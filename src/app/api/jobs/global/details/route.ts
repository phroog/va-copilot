import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * POST /api/jobs/global/details  (x-admin-secret)
 * Store enriched detail (full description etc.) scraped from the platform's
 * job detail page. Looks the job up by external_id (the stable platform URL).
 * Body: { external_id, detail }
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { external_id, detail } = body || {};
  if (!external_id || typeof detail !== "object") {
    return NextResponse.json({ error: "external_id and detail are required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: job, error: findError } = await supabase
    .from("global_jobs")
    .select("id")
    .eq("external_id", external_id)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!job) return NextResponse.json({ ok: true, updated: false }); // not in feed (filtered?) — ignore

  const { error: updError } = await supabase
    .from("global_jobs")
    .update({ detail })
    .eq("id", job.id);
  if (updError) return NextResponse.json({ error: updError.message }, { status: 500 });

  return NextResponse.json({ ok: true, updated: true });
}
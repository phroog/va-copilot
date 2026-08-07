import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { upsertGlobalJob } from "@/lib/jobs/global";

/**
 * Accepts jobs scraped by the browser extension "Admin Mode" and inserts
 * them into the shared live feed. Protected by ADMIN_SECRET.
 *
 * Body: { jobs: Job[], sourceId?: string }
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  }

  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const jobs = Array.isArray(body) ? body : Array.isArray(body.jobs) ? body.jobs : [];
  const sourceId: string | null = body.sourceId ?? null;

  const supabase = createServiceRoleClient();
  const inserted: string[] = [];
  let duplicates = 0;

  for (const rawJob of jobs) {
    const { job, inserted: isNew } = await upsertGlobalJob({
      ...rawJob,
      source_id: rawJob.source_id ?? sourceId,
      posted_at: rawJob.posted_at ?? new Date().toISOString(),
    });
    if (job?.id) {
      if (isNew) inserted.push(job.id);
      else duplicates++;
    }
  }

  // Mark the source as collected so it isn't re-polled for 10 minutes —
  // even when nothing was found, so a broken source isn't retried every pass.
  if (sourceId) {
    await supabase
      .from("job_sources")
      .update({ last_collected_at: new Date().toISOString() })
      .eq("id", sourceId);
  }

  return NextResponse.json({ ok: true, inserted: inserted.length, duplicates });
}

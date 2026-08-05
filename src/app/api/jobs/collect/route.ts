import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parseJobSource } from "@/lib/jobs/feed-parser";
import { upsertGlobalJob } from "@/lib/jobs/global";

/**
 * Central collector for RSS / API job sources.
 * Called by a Vercel Cron job (see vercel.json) every 5 minutes.
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const xCron = request.headers.get("x-cron-secret") ?? "";
  const isAuthorized =
    xCron === secret || auth === `Bearer ${secret}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: sources, error: sourceError } = await supabase
    .from("job_sources")
    .select("*")
    .in("source_type", ["rss", "api"])
    .eq("is_active", true);

  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }

  const results: any[] = [];
  let newJobs = 0;
  let totalFound = 0;

  for (const source of (sources ?? [])) {
    const sourceResult: any = {
      id: source.id,
      name: source.name,
      found: 0,
      inserted: 0,
      error: null,
    };

    try {
      const jobs = await parseJobSource(source.url, source.source_type);
      totalFound += jobs.length;
      sourceResult.found = jobs.length;

      for (const job of jobs) {
        const inserted = await upsertGlobalJob({
          ...job,
          source_id: source.id,
          platform: job.platform || source.platform || source.name,
        });
        if (inserted?.collected_at) {
          const age = Date.now() - new Date(inserted.collected_at).getTime();
          if (age < 10 * 60 * 1000) {
            sourceResult.inserted++;
            newJobs++;
          }
        }
      }

      await supabase
        .from("job_sources")
        .update({ last_collected_at: new Date().toISOString() })
        .eq("id", source.id);
    } catch (e: any) {
      sourceResult.error = e.message ?? String(e);
      console.error(`Collect failed for source ${source.name}:`, e.message ?? e);
      // Mark as attempted so we don't hammer a broken source on every tick.
      await supabase
        .from("job_sources")
        .update({ last_collected_at: new Date().toISOString() })
        .eq("id", source.id);
    }

    results.push(sourceResult);
  }

  return NextResponse.json({
    ok: true,
    sources: results.length,
    totalFound,
    newJobs,
    results,
  });
}

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Per-source search keywords for the web collector.
 * Called by the collector (x-admin-secret) while polling. Returns a map of
 * source name -> keywords. Sources with no configured keywords fall back to
 * the collector's built-in list (reported as null).
 */
export async function GET(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const [{ data: sources }, { data: keywordRows }] = await Promise.all([
    supabase.from("job_sources").select("id, name, platform"),
    supabase.from("job_source_keywords").select("source_id, keyword, position"),
  ]);

  if (!sources) {
    return NextResponse.json({ sources: [], error: sources ?? null }, { status: 500 });
  }

  const bySource: Record<string, { id: string; keywords: string[] }> = {};
  for (const s of sources) {
    bySource[s.id] = { id: s.id, keywords: [] };
  }

  for (const row of keywordRows ?? []) {
    if (!bySource[row.source_id]) continue;
    bySource[row.source_id].keywords.push(row.keyword);
  }

  const result = (sources ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    platform: s.platform,
    keywords: bySource[s.id]?.keywords ?? [],
  }));

  return NextResponse.json({ sources: result });
}
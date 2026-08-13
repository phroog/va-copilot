import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/stats  (x-admin-secret)
 * Real intake numbers: how many jobs are actually in the feed, how many were
 * collected in the last 24h / 7d, and per-platform breakdown.
 */
export async function GET(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

  const { count: total } = await supabase.from("global_jobs").select("*", { count: "exact", head: true });
  const { count: last24h } = await supabase.from("global_jobs").select("*", { count: "exact", head: true }).gte("collected_at", dayAgo);
  const { count: last7d } = await supabase.from("global_jobs").select("*", { count: "exact", head: true }).gte("collected_at", weekAgo);

  const { data: platforms } = await supabase.from("global_jobs").select("platform, collected_at");

  const byPlatformTotal: Record<string, number> = {};
  const byPlatform24h: Record<string, number> = {};
  for (const row of (platforms ?? [])) {
    const p = row.platform || "Unknown";
    byPlatformTotal[p] = (byPlatformTotal[p] || 0) + 1;
    const t = new Date(row.collected_at || 0).getTime();
    if (t >= Date.now() - 24 * 3600 * 1000) byPlatform24h[p] = (byPlatform24h[p] || 0) + 1;
  }

  return NextResponse.json({ total, last24h, last7d, byPlatformTotal, byPlatform24h });
}
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Returns web sources that haven't been polled in the last 10 minutes
 * (limited to 5 URLs). Called by the extension's "Admin Mode" background
 * script. Protected by ADMIN_SECRET.
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
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

  const { data: sources, error } = await supabase
    .from("job_sources")
    .select("id, name, url, platform")
    .eq("source_type", "web")
    .eq("is_active", true)
    .or(`last_collected_at.is.null,last_collected_at.lt.${cutoff}`)
    .order("last_collected_at", { ascending: true, nullsFirst: true })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sources: sources ?? [] });
}

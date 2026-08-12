import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Reset the last_collected_at of a source so the collector picks it up on
 * the next poll immediately (admin "scan now"). Protected by ADMIN_SECRET.
 * Body: { id?: string, name?: string }
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, name } = body || {};
  if (typeof id !== "string" && typeof name !== "string") {
    return NextResponse.json({ error: "Expected { id } or { name }" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  let query = supabase.from("job_sources").update({ last_collected_at: null });
  if (typeof id === "string") query = query.eq("id", id);
  else query = query.eq("name", name);

  const { data, error } = await query.select("id, name, is_active").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  return NextResponse.json({ ok: true, source: data });
}
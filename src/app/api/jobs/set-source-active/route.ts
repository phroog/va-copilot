import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Set web job sources active/inactive. Protected by ADMIN_SECRET so only
 * the collector can enable/disable sources after field evaluation.
 * Body: { name: string, is_active: boolean }
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

  const { name, is_active } = body || {};
  if (typeof name !== "string" || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "Expected { name: string, is_active: boolean }" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("job_sources")
    .update({ is_active })
    .eq("name", name)
    .select("id, name, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: `No source named "${name}"` }, { status: 404 });
  return NextResponse.json({ ok: true, source: data });
}

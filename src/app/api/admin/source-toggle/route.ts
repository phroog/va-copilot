import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Toggle a job source active/inactive (like the collector's set-source-active) from the admin dashboard. */
export async function POST(request: Request) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  const ok = await verifyAdminSession(token, secret);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, is_active } = body || {};
  if (typeof id !== "string" || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "Expected { id: string, is_active: boolean }" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("job_sources")
    .update({ is_active })
    .eq("id", id)
    .select("id, name, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  return NextResponse.json({ ok: true, source: data });
}
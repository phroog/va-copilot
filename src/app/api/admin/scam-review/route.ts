import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * POST /api/admin/scam-review  { id, status, risk }  (x-admin-secret)
 * Admin approves/rejects a pending scam-registry report. Approved entries
 * become part of the official directory.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "";
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; status?: string; risk?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.id || !["pending", "approved", "rejected"].includes(body.status || "")) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }

  const update: Record<string, any> = { status: body.status };
  if (body.risk && ["low", "medium", "high"].includes(body.risk)) update.risk = body.risk;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("scam_registry")
    .update(update)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
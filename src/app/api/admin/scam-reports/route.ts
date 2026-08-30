import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "";
  return verifyAdminSession(token, secret);
}

/**
 * GET /api/admin/scam-reports?status=pending
 * Lists scam-registry reports (pending by default) for review.
 */
export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("scam_registry")
    .select("*, auth_users:auth.users(email)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

/**
 * POST /api/admin/scam-reports  { id, status, risk }
 * Approve/reject a pending report. Approved entries become official.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; status?: string; risk?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.id || !["pending", "approved", "rejected"].includes(body.status || "")) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }

  const update: Record<string, any> = { status: body.status };
  if (body.risk && ["low", "medium", "high"].includes(body.risk)) update.risk = body.risk;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("scam_registry").update(update).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
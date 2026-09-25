import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";
import { ensureDaily } from "@/lib/learn/energy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminOk(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  return verifyAdminSession(token, secret);
}

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  if (!(await adminOk())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createServiceRoleClient();

  const { data: authUser } = await admin.auth.admin.getUserById(params.userId);
  const user = authUser?.user ?? null;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const email = user.email ?? null;

  const [profile, sub, grant, lead] = await Promise.all([
    admin.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    admin.from("subscriptions").select("plan,status,access_until,current_period_end").eq("user_id", user.id).maybeSingle(),
    admin.from("user_grants").select("*").eq("user_id", user.id).maybeSingle(),
    email ? admin.from("funnel_leads").select("*").eq("email", email).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email,
      created_at: user.created_at,
    },
    profile: profile.data ?? null,
    subscription: sub.data ?? null,
    grants: grant.data ?? { user_id: user.id, unlimited_playtime: false, note: null, updated_at: null },
    lead: lead.data ?? null,
  });
}

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  if (!(await adminOk())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createServiceRoleClient();
  const body = await request.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if (typeof body.unlimited_playtime === "boolean") update.unlimited_playtime = body.unlimited_playtime;
  if (typeof body.note === "string") update.note = body.note.trim().slice(0, 500) || null;
  update.updated_at = new Date().toISOString();

  const { error } = await admin
    .from("user_grants")
    .upsert({ user_id: params.userId, ...update }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // One-off gift: extra lesson slots for today.
  const gift = Math.max(0, Math.min(Math.round(Number(body.grant_lessons) || 0), 1000));
  if (gift > 0) {
    await ensureDaily(admin, params.userId);
    const { data: p } = await admin.from("profiles").select("bonus_lessons_today").eq("user_id", params.userId).maybeSingle();
    await admin.from("profiles").update({ bonus_lessons_today: (p?.bonus_lessons_today ?? 0) + gift }).eq("user_id", params.userId);
  }

  const { data: fresh } = await admin.from("user_grants").select("*").eq("user_id", params.userId).maybeSingle();
  return NextResponse.json({ ok: true, grants: fresh });
}
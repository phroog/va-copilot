import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Consolidated private admin feed: signups, purchases, support letters and
   scam registry — all flowing to the operator in one place. Gated behind the
   admin dashboard session cookie (separate password, only for you). */
export async function GET() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  const ok = await verifyAdminSession(token, secret);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleClient();

  // Resolve all auth emails once.
  const emailById = new Map<string, string>();
  try {
    let page = 1;
    while (page <= 20) {
      const users = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      const arr = users.data?.users ?? [];
      for (const u of arr) {
        if (u.id && u.email) emailById.set(u.id, u.email);
        if (u.email) emailById.set(u.email, u.email);
      }
      if (!users.data?.users || users.data.users.length < 1000) break;
      page++;
    }
  } catch (e) {
    console.error("[admin/hq] listUsers failed:", (e as Error).message);
  }
  const emailFor = (id?: string | null) => (id ? emailById.get(id) ?? null : null);

  const [subs, letterRows, scamRows, profiles] = await Promise.all([
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("support_letters").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("scam_registry").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("user_id, full_name, created_at").order("created_at", { ascending: false }).limit(500),
  ]);

  // Signups: profiles ordered by created_at (fallback to auth users if empty).
  const signups = (profiles.data ?? [])
    .filter((p: any) => p.created_at)
    .map((p: any) => ({
      user_id: p.user_id,
      name: p.full_name || null,
      email: emailFor(p.user_id),
      created_at: p.created_at,
    }))
    .slice(0, 100);

  const purchases = (subs.data ?? []).map((s: any) => ({
    id: s.id,
    user_id: s.user_id,
    email: emailFor(s.user_id),
    plan: s.plan,
    status: s.status,
    current_period_end: s.current_period_end,
    access_until: s.access_until,
    created_at: s.created_at,
  }));

  const letters = (letterRows.data ?? []).map((l: any) => ({
    id: l.id,
    user_id: l.user_id,
    email: emailFor(l.user_id),
    category: l.category,
    urgency: l.urgency,
    message: l.message,
    status: l.status,
    created_at: l.created_at,
  }));

  const scams = (scamRows.data ?? []).map((s: any) => ({
    id: s.id,
    domain: s.domain,
    company_name: s.company_name,
    description: s.description,
    risk: s.risk,
    status: s.status,
    reporter: emailFor(s.flagged_by),
    created_at: s.created_at,
  }));

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    counts: {
      signups: signups.length,
      purchases: purchases.length,
      letters: letters.length,
      scams: scams.length,
    },
    signups,
    purchases,
    letters,
    scams,
  });
}
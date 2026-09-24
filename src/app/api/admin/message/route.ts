import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Operator → user feed messages. Sender name is chosen by the operator.
export async function POST(request: Request) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  const ok = await verifyAdminSession(token, secret);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipient, sender_name, title, body } = await request.json().catch(() => ({}));
  const sender = (sender_name || "").trim();
  const t = (title || "").trim();
  const b = (body || "").trim();
  if (!sender || !t || !b) {
    return NextResponse.json({ error: "sender_name, title and body are required" }, { status: 400 });
  }
  if (recipient !== "all" && typeof recipient === "string" && recipient.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient.trim())) {
    return NextResponse.json({ error: "recipient must be 'all' or a valid email" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("feed_messages")
    .insert({ recipient_email: recipient === "all" ? null : (recipient || "").trim().toLowerCase() || null, sender_name: sender, title: t, body: b })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: data });
}
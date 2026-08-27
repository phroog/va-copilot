import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendEmail, emailConfigured, layoutEmail, unsubscribeToken } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/emails/broadcast
 * Admin-only (x-admin-secret). Sends a marketing email to all users who have
 * not opted out. Body: { subject, bodyHtml }. Each mail includes an
 * unsubscribe link.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "";
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Email not configured (RESEND_API_KEY missing)" }, { status: 500 });
  }

  let body: { subject?: string; bodyHtml?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.subject || !body.bodyHtml) {
    return NextResponse.json({ error: "subject and bodyHtml are required" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://va-copilot-theta.vercel.app";

  const supabase = createServiceRoleClient();
  const { data: optOuts } = await supabase.from("profiles").select("user_id").eq("email_opt_out", true);
  const optOutSet = new Set((optOuts || []).map((r) => r.user_id));

  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const recipients = (users?.users || []).filter((u) => u.email && !optOutSet.has(u.id));

  let sent = 0;
  let failed = 0;
  for (const u of recipients) {
    const email = (u.email || "").toLowerCase();
    const token = unsubscribeToken(email);
    const footer = `You are receiving this because you use Sari. Unsubscribe from marketing emails: <a href="${appUrl}/api/emails/unsubscribe?e=${encodeURIComponent(email)}&t=${token}">Unsubscribe</a>`;
    const ok = await sendEmail({
      to: email,
      subject: body.subject,
      html: layoutEmail(body.subject, body.bodyHtml, footer),
    });
    if (ok) sent++; else failed++;
  }

  return NextResponse.json({ sent, failed, total: recipients.length });
}
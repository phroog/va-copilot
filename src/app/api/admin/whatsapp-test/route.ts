import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";
import { whatsappConfigured, sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin tool: send a WhatsApp test message / hello_world template to a number,
// so you can verify the pipeline works without curl.
export async function POST(request: Request) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  if (!(await verifyAdminSession(token, secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, kind = "text" } = await request.json().catch(() => ({}));
  const phone = String(to || "").replace(/[^0-9]/g, "");
  if (!phone) return NextResponse.json({ error: "A phone number is required" }, { status: 400 });
  if (!whatsappConfigured()) {
    return NextResponse.json({ error: "WhatsApp not configured — set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID" }, { status: 500 });
  }

  let ok = false;
  let detail = "";
  if (kind === "template") {
    ok = await sendWhatsAppTemplate(phone, "hello_world", []);
    detail = "template: hello_world (en_US)";
  } else {
    ok = await sendWhatsAppText(phone, "🔔 Sari test message — WhatsApp is live. Reply here anytime!");
    detail = "text message";
  }

  return NextResponse.json({ ok, detail, sentTo: phone });
}

export async function GET() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  if (!(await verifyAdminSession(token, secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createServiceRoleClient();
  const { data } = await admin.from("whatsapp_sessions").select("phone, updated_at, messages").order("updated_at", { ascending: false }).limit(20);
  return NextResponse.json({ configured: whatsappConfigured(), sessions: data ?? [] });
}
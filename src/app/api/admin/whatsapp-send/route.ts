import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/session";
import { sendWhatsAppText, whatsappConfigured } from "@/lib/whatsapp";
import { sendMessenger } from "@/lib/messenger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Operator sends a custom WhatsApp message to a conversation from the HQ.
export async function POST(request: Request) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_DASHBOARD_PASSWORD || "sari-admin";
  if (!(await verifyAdminSession(token, secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone, message } = await request.json().catch(() => ({}));
  const to = String(phone || "").replace(/\D/g, "");
  const body = String(message || "").trim();
  if (!to || !body) return NextResponse.json({ error: "phone and message required" }, { status: 400 });
  if (!whatsappConfigured()) return NextResponse.json({ error: "WhatsApp not configured" }, { status: 500 });

  const admin = createServiceRoleClient();
  const { data: session } = await admin.from("whatsapp_sessions").select("channel, channel_id").eq("phone", to).maybeSingle();
  const channel = session?.channel ?? "whatsapp";
  let ok = false;
  let error: string | undefined;
  if (channel === "messenger") {
    const r = await sendMessenger(session?.channel_id ?? to, { text: body });
    ok = r.ok;
    error = r.error;
  } else {
    ok = await sendWhatsAppText(to, body);
  }

  if (ok) {
    // Append to the conversation history so the bot's context stays coherent.
    const { data: row } = await admin.from("whatsapp_sessions").select("messages").eq("phone", to).maybeSingle();
    const messages = [...((row?.messages ?? []) as any[]), { role: "assistant", content: body }];
    await admin.from("whatsapp_sessions").upsert({ phone: to, messages, updated_at: new Date().toISOString() }, { onConflict: "phone" });
  }

  return NextResponse.json({ ok, sent: ok ? 1 : 0, error, channel });
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsApp, sendWhatsAppTemplate, whatsappWelcomeMessage, normalizePhone, whatsappConfigured } from "@/lib/whatsapp";

export const runtime = "nodejs";

/* POST /api/whatsapp/welcome
 * Called right after signup: stores the user's WhatsApp number and fires the
 * first message immediately (speed-to-lead). Returns whether it was sent. */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const phone = normalizePhone(body?.phone || "");
  if (!phone) return NextResponse.json({ error: "No phone" }, { status: 400 });

  // Persist for future messages.
  await supabase.from("user_settings").upsert({ user_id: user.id, phone }, { onConflict: "user_id" });

  let sent = false;
  if (whatsappConfigured()) {
    // A template message reaches cold numbers (no open 24h window). Free-form
    // text only works if the user already messaged the business.
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "";
    sent = templateName
      ? await sendWhatsAppTemplate(phone, templateName)
      : await sendWhatsApp(phone, whatsappWelcomeMessage());
  } else {
    console.log("[whatsapp:welcome] not configured (missing WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)");
  }

  return NextResponse.json({ sent, configured: whatsappConfigured() });
}

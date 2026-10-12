import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { BOOKING_CONFIRMED_TEXT, FOLLOWUP_TEXT } from "@/lib/whatsapp-flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.CALCOM_WEBHOOK_SECRET || "";

function signatureOk(rawBody: string, header: string | null): boolean {
  if (!SECRET || !header) return true; // dev fallback if no secret configured
  const provided = header.replace(/^sha256=/, "");
  const calculated = createHmac("sha256", SECRET).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(calculated, "hex"));
  } catch {
    return false;
  }
}

// Find a phone number in Cal.com webhook responses (the Phone question the
// invitee filled in; the bot prefills it via ?phone= so it's always present).
function extractPhone(payload: any): string | null {
  const responses = Array.isArray(payload?.responses) ? payload.responses : [];
  for (const r of responses) {
    if (typeof r?.answer === "string") {
      const digits = r.answer.replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 15) {
        const m = r.answer.match(/\+?\d[\d\s\-().]{7,}/);
        if (m) return m[0].replace(/\D/g, "");
      }
    }
  }
  const inviteePhone = payload?.invitee?.phone?.replace?.(/\D/g, "");
  if (inviteePhone && inviteePhone.length >= 8) return inviteePhone;
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!signatureOk(rawBody, request.headers.get("x-cal-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: "ok" });
  }

  const trigger = String(body?.triggerEvent || "");
  if (!trigger.includes("BOOKING_CREATED") && !trigger.toLowerCase().includes("booking.created")) {
    return NextResponse.json({ status: "ok" });
  }

  const payload = body.payload ?? {};
  const bookingUid = payload?.booking?.uid ?? null;
  const bookingUrl = payload?.booking?.url ?? (bookingUid ? `https://cal.com/booking/${bookingUid}` : null);
  const phone = extractPhone(payload);
  if (!phone) {
    console.warn("[cal] booking created but no phone found in webhook — can't confirm via WhatsApp.");
    return NextResponse.json({ status: "ok" });
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin.from("whatsapp_sessions").select("*").eq("phone", phone).maybeSingle();
  const now = new Date();

  // Follow-up inside the user's 24h WhatsApp window (relative to their FIRST
  // message — after that the business can no longer message freely).
  const firstSeen = row?.first_seen_at ? new Date(row.first_seen_at) : now;
  const followupAt = new Date(Math.min(firstSeen.getTime() + 20 * 3_600_000, now.getTime() + 60 * 60_000)).toISOString();

  const confirmedText = bookingUrl ? `${BOOKING_CONFIRMED_TEXT}\n\n📅 ${bookingUrl}` : BOOKING_CONFIRMED_TEXT;
  await sendWhatsAppText(phone, confirmedText);

  await admin.from("whatsapp_sessions").upsert(
    {
      phone,
      stage: "booked",
      booked_url: bookingUrl ?? null,
      booked_at: now.toISOString(),
      followup_at: followupAt,
      followup_sent: false,
      updated_at: now.toISOString(),
      messages: [...((row?.messages ?? []) as any[]), { role: "system", content: "cal.com booking created" }],
    },
    { onConflict: "phone" }
  );

  return NextResponse.json({ status: "ok" });
}
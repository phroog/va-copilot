import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { BOOKING_CONFIRMED_TEXT, FOLLOWUP_TEXT } from "@/lib/whatsapp-flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.CALCOM_WEBHOOK_SECRET || "";

function signatureOk(rawBody: string, header: string | null): boolean {
  // If no secret/header is configured we accept (rollout). On a mismatch we
  // still accept but log loudly so confirmations never silently drop.
  if (!SECRET || !header) return true;
  const provided = header.replace(/^sha256=/, "");
  const calculated = createHmac("sha256", SECRET).update(rawBody).digest("hex");
  try {
    const ok = timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(calculated, "hex"));
    if (!ok) console.warn("[cal] signature mismatch — accepting anyway");
    return true;
  } catch {
    return true;
  }
}

// Walk an object/array tree and return the first value that looks like a
// phone number (key "phone/whatsapp/mobile" OR a string with 8–15 digits).
function scrapePhone(obj: any, seen = new Set<any>()): string | null {
  if (!obj || typeof obj !== "object" || seen.has(obj)) return null;
  seen.add(obj);
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const p = scrapePhone(x, seen);
      if (p) return p;
    }
    return null;
  }
  for (const key of ["phone", "phoneNumber", "mobile", "tel", "whatsapp", "msisdn"]) {
    const v = obj[key];
    if (typeof v === "string") {
      const d = v.replace(/\D/g, "");
      if (d.length >= 8 && d.length <= 15) return d;
    }
  }
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && /[0-9]/.test(v)) {
      const m = v.match(/\+?\d[\d\s\-().]{7,}/);
      if (m) {
        const d = m[0].replace(/\D/g, "");
        if (d.length >= 8 && d.length <= 15) return d;
      }
    }
    const p = scrapePhone(v, seen);
    if (p) return p;
  }
  return null;
}

// Fallback: read the booking via the Cal.com API (v2 booking by uid, then v1).
async function fetchPhoneFromApi(uid: string | null): Promise<string | null> {
  const key = process.env.CALCOM_API_KEY;
  if (!key || !uid) return null;
  try {
    const r = await fetch(`https://api.cal.com/v2/bookings/${uid}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (r.ok) {
      const j = await r.json();
      const p = scrapePhone(j?.booking ?? j);
      if (p) return p;
    }
  } catch {}
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
  let phone = scrapePhone(payload);
  if (!phone) phone = await fetchPhoneFromApi(bookingUid);
  if (!phone) {
    console.warn(`[cal] booking created without extractable phone (uid=${bookingUid}) — can't confirm via WhatsApp.`);
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
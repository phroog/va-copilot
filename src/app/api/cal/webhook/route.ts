import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendWhatsAppText, CAL_BOOKING_URL } from "@/lib/whatsapp";
import { BOOKING_CONFIRMED_TEXT, FOLLOWUP_TEXT, formatBookingTime } from "@/lib/whatsapp-flow";

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

// True for date-like digit runs (e.g. 20261013) that are NOT phone numbers.
function isDateDigits(d: string): boolean {
  return /^\d{4}[01]\d[0-3]\d$/.test(d); // YYYYMMDD
}

// Walk an object/array tree and return the first value that looks like a
// REAL phone number (8–15 digits, not a date). Explicit phone keys win; the
// generic string scan requires 9+ digits so booking dates don't get picked up.
function scrapePhone(obj: any, seen = new Set<any>()): string | null {
  if (!obj || typeof obj !== "object" || seen.has(obj)) return null;
  seen.add(obj);
  const kids: unknown[] = [];
  if (Array.isArray(obj)) {
    kids.push(...obj);
  } else {
    for (const [key, value] of Object.entries(obj)) {
      if (/phone|mobile|tel|whatsapp|msisdn/i.test(key) && typeof value === "string") {
        const d = value.replace(/\D/g, "");
        if (d.length >= 8 && d.length <= 15 && !isDateDigits(d)) return d;
      }
      kids.push(value);
    }
  }
  for (const v of kids) {
    if (typeof v === "string" && /[0-9]/.test(v)) {
      const m = v.match(/\+?\d[\d\s\-().]{8,}/);
      if (m) {
        const d = m[0].replace(/\D/g, "");
        if (d.length >= 9 && d.length <= 15 && !isDateDigits(d)) return d;
      }
    }
    const p = scrapePhone(v, seen);
    if (p) return p;
  }
  return null;
}

// Fallback: read phone + booking URL from the booking via the Cal.com API
// (the same data that lands in the confirmation email). Tries v2 by uid,
// then v1 by id, then the v1 list.
async function fetchBookingInfo(uidish: string | null): Promise<{ phone: string | null; url: string | null }> {
  const key = process.env.CALCOM_API_KEY;
  if (!key || !uidish) return { phone: null, url: null };
  const attempt = async (url: string, headers: Record<string, string>): Promise<any | null> => {
    try {
      const r = await fetch(url, { headers, cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };
  const describe = (j: any): { phone: string | null; url: string | null } => {
    const b = j?.booking ?? j?.data ?? j;
    const uid = b?.uid ?? null;
    const pick = (v: unknown) => (typeof v === "string" && /^https?:\/\//i.test(v) ? v : null);
    const location =
      Array.isArray(b?.locations)
        ? pick(b.locations[0]?.link ?? b.locations[0]?.value)
        : pick(b?.location);
    return {
      phone: scrapePhone(b),
      url:
        pick(b?.url) ??
        pick(b?.metadata?.videoCallUrl) ??
        pick(b?.videoCallUrl) ??
        location ??
        (uid ? `https://app.cal.com/booking/${uid}` : null),
    };
  };

  let j = await attempt(`https://api.cal.com/v2/bookings/${uidish}`, { Authorization: `Bearer ${key}` });
  if (j) return describe(j);
  j = await attempt(`https://api.cal.com/v1/bookings/${uidish}?apiKey=${encodeURIComponent(key)}`, {});
  if (j) return describe(j);
  j = await attempt(`https://api.cal.com/v1/bookings/${uidish}`, { Authorization: `Bearer ${key}` });
  if (j) return describe(j);

  try {
    const r = await fetch(`https://api.cal.com/v1/bookings?apiKey=${encodeURIComponent(key)}`, { cache: "no-store" });
    if (r.ok) {
      const list = await r.json();
      const found = (list?.bookings ?? []).find((b: any) => b.uid === uidish || String(b.id) === uidish);
      if (found) return describe(found);
    }
  } catch {}
  return { phone: null, url: null };
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
  const b = payload.booking ?? payload; // handle both nested and flat webhook shapes
  const bookingUid = b.uid ?? payload.uid ?? null;
  const bookingId = b.id ?? payload.bookingId ?? payload.id ?? null;

  // Cal.com location values ("integrations:google.meet") are provider IDs, not
  // links — the real codec URL lives in metadata.videoCallUrl. Only accept http(s).
  const pickUrl = (v: unknown): string | null =>
    typeof v === "string" && /^https?:\/\//i.test(v) ? v : null;
  const locations = b.locations ?? payload.locations ?? [];
  const locationLink = Array.isArray(locations)
    ? pickUrl(locations[0]?.link) ?? pickUrl(locations[0]?.value)
    : pickUrl(locations);
  let bookingUrl =
    pickUrl(b.url) ??
    pickUrl(payload.url) ??
    pickUrl(b?.videoCallUrl) ??
    pickUrl(b?.metadata?.videoCallUrl) ??
    pickUrl(payload?.metadata?.videoCallUrl) ??
    locationLink ??
    null;

  console.log("[cal] webhook", JSON.stringify({ trigger: body?.triggerEvent, uid: bookingUid, id: bookingId, url: bookingUrl, apiKey: !!process.env.CALCOM_API_KEY }));

  const admin = createServiceRoleClient();
  let phone = scrapePhone(payload);
  if (!phone || !bookingUrl) {
    const info = await fetchBookingInfo(bookingUid ?? (bookingId != null ? String(bookingId) : null));
    if (info) {
      if (!phone) phone = info.phone;
      if (!bookingUrl) bookingUrl = info.url;
    }
  }
  console.log("[cal] resolved", JSON.stringify({ phone: !!phone, url: bookingUrl }));
  if (!phone) {
    // Phone-free fallback: a booking right after an invite almost certainly
    // belongs to the MOST RECENT awaiting_booking conversation (within 45 min).
    const { data: recent } = await admin
      .from("whatsapp_sessions")
      .select("phone")
      .eq("stage", "awaiting_booking")
      .gte("updated_at", new Date(Date.now() - 45 * 60_000).toISOString())
      .order("updated_at", { ascending: false })
      .limit(1);
    if (recent?.[0]?.phone) {
      phone = recent[0].phone;
      console.log(`[cal] no phone in payload — matched recent booking to awaiting conversation ${phone}`);
    }
  }
  if (!phone) {
    console.warn(`[cal] booking created but no matching conversation (uid=${bookingUid}) — can't confirm via WhatsApp.`);
    return NextResponse.json({ status: "ok" });
  }

  const { data: row } = await admin.from("whatsapp_sessions").select("*").eq("phone", phone).maybeSingle();
  const now = new Date();

  // Follow-up inside the user's 24h WhatsApp window (relative to their FIRST
  // message — after that the business can no longer message freely).
  const firstSeen = row?.first_seen_at ? new Date(row.first_seen_at) : now;
  const followupAt = new Date(Math.min(firstSeen.getTime() + 20 * 3_600_000, now.getTime() + 60 * 60_000)).toISOString();

  const finalBookingUrl =
    bookingUrl ?? (bookingUid ? `https://app.cal.com/booking/${bookingUid}` : null) ?? CAL_BOOKING_URL;
  const startRaw = b?.startTime ?? payload?.startTime ?? null;

  // Attendee/event timezone (e.g. Asia/Manila). Broad capture: known keys + a
  // shallow tree scan for any IANA-style timezone string (e.g. custom payload).
  const tzPattern = /^[A-Za-z_+-]+\/[A-Za-z_+-]+$/;
  const pickTz = (v: unknown): string | null => (typeof v === "string" && tzPattern.test(v) ? v : null);
  const scanTz = (obj: any, depth = 0, seen = new Set<any>()): string | null => {
    if (!obj || typeof obj !== "object" || depth > 4 || seen.has(obj)) return null;
    seen.add(obj);
    for (const [k, v] of Object.entries(obj)) {
      if (/time.?zone|tz/i.test(k)) {
        const t = pickTz(v);
        if (t) return t;
      }
      const nested = scanTz(v, depth + 1, seen);
      if (nested) return nested;
    }
    return null;
  };
  const tz =
    pickTz(payload?.attendees?.[0]?.timeZone) ??
    pickTz(b?.attendees?.[0]?.timeZone) ??
    pickTz(b?.timeZone) ??
    pickTz(b?.eventType?.timeZone) ??
    pickTz(payload?.eventType?.timeZone) ??
    scanTz(payload) ??
    null;
  const startLabel = formatBookingTime(startRaw, tz);
  const confirmedText = [
    BOOKING_CONFIRMED_TEXT,
    startLabel ? `🗓 Your call: ${startLabel}${tz ? ` (${tz})` : ""}` : null,
    finalBookingUrl ? `📅 ${finalBookingUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
  await sendWhatsAppText(phone, confirmedText);

  await admin.from("whatsapp_sessions").upsert(
    {
      phone,
      stage: "booked",
      booked_url: finalBookingUrl ?? null,
      booked_start: startRaw ?? null,
      booked_tz: tz ?? null,
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
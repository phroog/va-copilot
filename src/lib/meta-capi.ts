import { createHash } from "crypto";

/* Server-side Meta Conversions API (CAPI).
   Sends standard events (CompleteRegistration, Purchase) directly to Meta's
   Graph API — a reliable complement to the browser pixel (survives ad-blockers,
   ITP, etc.). Uses META_ACCESS_TOKEN + the pixel id from env. */

const PIXEL_ID = process.env.META_PIXEL_ID || "1068796469204800";
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
const GRAPH_API = "https://graph.facebook.com/v18.0";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

interface MetaEvent {
  eventName: string;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  customData?: Record<string, any>;
}

/* Send one or more events to Meta CAPI. Returns true if accepted (2xx). */
export async function sendMetaEvents(events: MetaEvent[]): Promise<boolean> {
  if (!ACCESS_TOKEN) return false;
  if (events.length === 0) return false;

  const now = Math.floor(Date.now() / 1000);
  const data = events.map((e) => {
    const userData: Record<string, any> = {};
    if (e.email) userData.em = [sha256(e.email)];
    if (e.ip) userData.client_ip_address = e.ip;
    if (e.userAgent) userData.client_user_agent = e.userAgent;
    if (e.fbp) userData.fbp = e.fbp;
    if (e.fbc) userData.fbc = e.fbc;

    const payload: Record<string, any> = {
      event_name: e.eventName,
      event_time: now,
      event_id: `${e.eventName}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      action_source: "website",
    };
    if (Object.keys(userData).length > 0) payload.user_data = userData;
    if (e.customData && Object.keys(e.customData).length > 0) payload.custom_data = e.customData;
    if (e.eventSourceUrl) payload.event_source_url = e.eventSourceUrl;

    return payload;
  });

  try {
    const res = await fetch(`${GRAPH_API}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* Convenience: fire a CompleteRegistration event (signup). */
export function metaCompleteRegistration(opts: {
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  sourceUrl?: string | null;
}) {
  return sendMetaEvents([
    {
      eventName: "CompleteRegistration",
      email: opts.email,
      ip: opts.ip,
      userAgent: opts.userAgent,
      eventSourceUrl: opts.sourceUrl,
      customData: { content_name: "signup", status: "true" },
    },
  ]);
}

/* Convenience: fire a Purchase event. */
export function metaPurchase(opts: {
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  sourceUrl?: string | null;
  value?: number;
  currency?: string;
}) {
  return sendMetaEvents([
    {
      eventName: "Purchase",
      email: opts.email,
      ip: opts.ip,
      userAgent: opts.userAgent,
      eventSourceUrl: opts.sourceUrl,
      customData: {
        value: opts.value ?? 0,
        currency: opts.currency ?? "USD",
      },
    },
  ]);
}
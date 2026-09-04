import { NextResponse } from "next/server";
import { metaPageView } from "@/lib/meta-capi";

export const runtime = "nodejs";

/* POST /api/meta/pageview
 * Server-side CAPI PageView. Called by the client on every page load so landing
 * visits are tracked even when the browser pixel is blocked (ad-blockers/ITP).
 * Only accepts requests from our own origin to avoid junk events. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin") || "";
  const host = request.headers.get("host") || "";
  const allowed = ["getsari.com", "va-copilot-theta.vercel.app", "localhost:3000"];
  const okOrigin = allowed.some((d) => origin.includes(d)) || allowed.some((d) => host.includes(d));
  if (!okOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { url?: string; fbp?: string; eventId?: string } = {};
  try { body = await request.json(); } catch {}

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent") || null;
  const referer = request.headers.get("referer") || body.url || origin || null;

  // Fire-and-forget; always respond 200 quickly.
  metaPageView({ ip, userAgent, sourceUrl: referer, fbp: body.fbp, eventId: body.eventId }).catch(() => {});

  return NextResponse.json({ ok: true });
}
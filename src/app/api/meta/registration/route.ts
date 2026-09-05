import { NextResponse } from "next/server";
import { metaCompleteRegistration } from "@/lib/meta-capi";

export const runtime = "nodejs";

/* POST /api/meta/registration
 * Server-side CAPI CompleteRegistration, fired at the moment the user submits
 * their email (magic-link request) — BEFORE they click the link. This way Meta
 * counts every signup intent as a successful registration, even for users who
 * never finish the magic-link flow. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin") || "";
  const host = request.headers.get("host") || "";
  const allowed = ["getsari.com", "va-copilot-theta.vercel.app", "localhost:3000"];
  const okOrigin = allowed.some((d) => origin.includes(d)) || allowed.some((d) => host.includes(d));
  if (!okOrigin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string } = {};
  try { body = await request.json(); } catch {}

  const email = body.email || null;
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent") || null;

  metaCompleteRegistration({ email, ip, userAgent, sourceUrl: origin }).catch(() => {});

  return NextResponse.json({ ok: true });
}
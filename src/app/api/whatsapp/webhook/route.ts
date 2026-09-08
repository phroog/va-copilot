import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* WhatsApp Business Cloud API webhook.
 * GET  — Meta's webhook verification handshake (hub.mode + hub.verify_token).
 * POST — incoming messages & status updates (speed-to-lead is outbound via
 *        /api/whatsapp/send, but we acknowledge inbound so Meta stays happy). */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";

  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return new Response(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  // Inbound messages/statuses: just acknowledge for now. We can reply or route
  // replies here later (e.g. auto-answer "job alerts on" replies).
  console.log("[whatsapp:inbound]", JSON.stringify(body).slice(0, 600));

  return NextResponse.json({ received: true });
}

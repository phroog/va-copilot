import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendWhatsAppText, WHATSAPP_VERIFY } from "@/lib/whatsapp";
import { runWhatsAppBot, withBookingLink, type BotTurn } from "@/lib/whatsapp-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta webhook verification.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === WHATSAPP_VERIFY && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

async function handleIncoming(from: string, text: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: row } = await admin.from("whatsapp_sessions").select("messages").eq("phone", from).maybeSingle();
  const history: BotTurn[] = (row?.messages as BotTurn[]) ?? [];
  history.push({ role: "user", content: text });

  const { reply, bookCall } = await runWhatsAppBot(history);
  const assistant = withBookingLink(reply, bookCall);
  history.push({ role: "assistant", content: assistant });
  const capped = history.slice(-20);

  await admin.from("whatsapp_sessions").upsert(
    { phone: from, messages: capped, updated_at: new Date().toISOString() },
    { onConflict: "phone" }
  );
  await sendWhatsAppText(from, assistant);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ status: "ok" });

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const msg of value.messages ?? []) {
        if (msg.type === "text" && msg.text?.body && msg.from) {
          try {
            await handleIncoming(msg.from, msg.text.body);
          } catch (e) {
            console.error("[whatsapp] handler failed:", (e as Error).message);
          }
        }
      }
    }
  }
  return NextResponse.json({ status: "ok" });
}
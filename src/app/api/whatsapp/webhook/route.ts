import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendWhatsAppText, sendWhatsAppButtons, sendWhatsAppList, WHATSAPP_VERIFY } from "@/lib/whatsapp";
import { runFlow, type WaOut } from "@/lib/whatsapp-flow";

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

// Extract the reply text from a message regardless of how it arrived
// (plain text, quick-reply button, or list reply).
function replyText(msg: any): string {
  if (msg.type === "button" && msg.button?.text) return msg.button.text;
  if (msg.type === "list_reply" && msg.list_reply?.title) return msg.list_reply.title;
  if (msg.text?.body) return msg.text.body;
  return "";
}

// Hidden codewords that wipe the conversation so you can test fresh cases.
const RESET_WORDS = ["reset", "restart", "start over", "startover", "fresh", "neustart", "neu"];
function isReset(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.startsWith("::")) return RESET_WORDS.includes(t.slice(2).trim());
  return RESET_WORDS.includes(t) || t.endsWith(" reset") || t.startsWith("reset ");
}

async function sendOuts(to: string, outs: WaOut[]): Promise<void> {
  for (const out of outs) {
    if (out.kind === "buttons") await sendWhatsAppButtons(to, out.text, out.buttons);
    else if (out.kind === "list") await sendWhatsAppList(to, out.text, out.rows);
    else await sendWhatsAppText(to, out.text);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ status: "ok" });

  const admin = createServiceRoleClient();

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const msg of value.messages ?? []) {
        const from = msg.from;
        if (!from) continue;
        const text = replyText(msg);
        if (!text) continue;

        try {
          // Reset codeword → wipe the session and start a fresh case.
          if (isReset(text)) {
            await admin.from("whatsapp_sessions").delete().eq("phone", from);
            await sendWhatsAppText(from, "🔄 Fresh start — let's go again from the top 👋");
          }

          const { data: row } = await admin.from("whatsapp_sessions").select("*").eq("phone", from).maybeSingle();
          const now = new Date().toISOString();
          const firstSeen = row?.first_seen_at ?? now;

          // Run the deterministic qualification flow.
          const { out, state } = runFlow(
            { stage: row?.stage ?? "new", people: row?.people ?? null },
            text,
            from
          );
          await sendOuts(from, out);

          const history = (row?.messages ?? []) as { role: string; content: string }[];
          history.push(
            { role: "user", content: text },
            { role: "assistant", content: out.map((o) => o.text).join(" | ") }
          );

          await admin.from("whatsapp_sessions").upsert(
            {
              phone: from,
              messages: history.slice(-20),
              stage: state.stage,
              people: state.people,
              first_seen_at: firstSeen,
              updated_at: now,
            },
            { onConflict: "phone" }
          );
        } catch (e) {
          console.error("[whatsapp] flow failed:", (e as Error).message);
        }
      }
    }
  }
  return NextResponse.json({ status: "ok" });
}
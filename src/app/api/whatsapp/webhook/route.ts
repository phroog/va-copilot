import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendWhatsAppText, sendWhatsAppButtons, sendWhatsAppList, WHATSAPP_VERIFY, calBookingLink } from "@/lib/whatsapp";
import { runFlow, type WaOut, FOLLOWUP_TEXT } from "@/lib/whatsapp-flow";
import { aiFallbackReply } from "@/lib/whatsapp-ai";

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
// (plain text, quick-reply button, or list reply). Checks every shape Meta uses.
function replyText(msg: any): string {
  if (typeof msg?.text?.body === "string" && msg.text.body) return msg.text.body;
  if (msg?.button?.text) return msg.button.text;
  if (msg?.button?.title) return msg.button.title;
  if (msg?.list_reply?.title) return msg.list_reply.title;
  if (msg?.list_reply?.description) return msg.list_reply.description;
  if (msg?.interactive?.type_reply?.title) return msg.interactive.type_reply.title;
  if (msg?.interactive?.list_reply?.title) return msg.interactive.list_reply.title;
  return "";
}

// Hidden codewords that wipe the conversation so you can test fresh cases.
const RESET_WORDS = ["reset", "restart", "start over", "startover", "fresh", "neustart", "neu"];
function isReset(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.startsWith("::")) return RESET_WORDS.includes(t.slice(2).trim());
  return RESET_WORDS.includes(t) || t.endsWith(" reset") || t.startsWith("reset ");
}

// Test codeword that sends the 24h follow-up immediately.
const FOLLOWUP_WORDS = ["followup", "test followup", "follow up", "reminder", "test reminder"];
function isFollowupCmd(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.startsWith("::")) return FOLLOWUP_WORDS.includes(t.slice(2).trim());
  return FOLLOWUP_WORDS.includes(t);
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
        if (!text) {
          console.warn("[whatsapp] unreadable message:", msg.type, JSON.stringify(msg).slice(0, 400));
          continue;
        }

        try {
          // Reset codeword → wipe the session and start a fresh case.
          if (isReset(text)) {
            await admin.from("whatsapp_sessions").delete().eq("phone", from);
            await sendWhatsAppText(from, "🔄 Fresh start — let's go again from the top 👋");
          }

          // Follow-up test → send the 24h follow-up right now (mark as sent so
          // the real cron doesn't send it again).
          if (isFollowupCmd(text)) {
            await sendWhatsAppText(from, FOLLOWUP_TEXT);
            await admin.from("whatsapp_sessions").update({ followup_sent: true, followup_at: new Date().toISOString() }).eq("phone", from);
            continue;
          }

          const { data: row } = await admin.from("whatsapp_sessions").select("*").eq("phone", from).maybeSingle();
          const now = new Date().toISOString();
          const firstSeen = row?.first_seen_at ?? now;

          // Run the deterministic qualification flow; free text after the invite/done
// stages gets a human DeepSeek answer instead of a canned reply.
          const { out: flowOut, state, fallback } = runFlow(
            { stage: row?.stage ?? "new", people: row?.people ?? null },
            text,
            from
          );

          let out: WaOut[] = flowOut;
          if (fallback) {
            let ai = "";
            try {
              ai = await aiFallbackReply(text, state.stage, {
                history: (row?.messages ?? []) as { role: string; content: string }[],
                bookedUrl: row?.booked_url ?? null,
                bookedStart: row?.booked_start ?? null,
              });
            } catch {
              ai = "";
            }
            const defaultText =
              state.stage === "awaiting_booking"
                ? `Love that question — that's honestly exactly what the call is for 🙂 Grab a 15-min slot and we'll go through it:\n\n${calBookingLink(from)}`
                : `Happy to help! The best place for real answers is a quick 15-min call — I'll make sure it's worth your time 🙂\n\n${calBookingLink(from)}`;
            out = [{ kind: "text", text: ai || defaultText }];
          }
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
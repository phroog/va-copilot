import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendMessengerText, sendMessengerQuickReplies, MESSENGER_VERIFY, type MsgQuickReply } from "@/lib/messenger";
import { CAL_BOOKING_URL } from "@/lib/whatsapp";
import { runFlow, FOLLOWUP_TEXT } from "@/lib/whatsapp-flow";
import { aiFallbackReply } from "@/lib/whatsapp-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESET_WORDS = ["reset", "restart", "start over", "startover", "fresh", "neustart", "neu"];
function isReset(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.startsWith("::")) return RESET_WORDS.includes(t.slice(2).trim());
  return RESET_WORDS.includes(t) || t.endsWith(" reset") || t.startsWith("reset ");
}
const FOLLOWUP_WORDS = ["followup", "test followup", "follow up", "reminder", "test reminder"];
function isFollowupCmd(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.startsWith("::")) return FOLLOWUP_WORDS.includes(t.slice(2).trim());
  return FOLLOWUP_WORDS.includes(t);
}

// Meta webhook verification.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === MESSENGER_VERIFY && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Map the shared flow output to Messenger sends (buttons/lists → quick replies).
async function sendOuts(psid: string, outs: ReturnType<typeof runFlow>["out"]): Promise<void> {
  for (const out of outs) {
    if (out.kind === "buttons") {
      const replies: MsgQuickReply[] = out.buttons.map((b) => ({ title: b.title, payload: b.id }));
      await sendMessengerQuickReplies(psid, out.text, replies);
    } else if (out.kind === "list") {
      const replies: MsgQuickReply[] = out.rows.map((r) => ({ title: r.title, payload: r.id }));
      await sendMessengerQuickReplies(psid, out.text, replies);
    } else {
      await sendMessengerText(psid, out.text);
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ status: "ok" });

  const admin = createServiceRoleClient();

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const psid = event.sender?.id;
      if (!psid) continue;
      let text = "";
      if (event.message?.text) text = event.message.text;
      else if (event.message?.quick_reply?.payload) text = event.message.quick_reply.payload;
      else if (event.postback?.payload) text = event.postback.payload;
      if (!text) continue;

      try {
        if (isReset(text)) {
          await admin.from("whatsapp_sessions").delete().eq("phone", psid);
          await sendMessengerText(psid, "🔄 Fresh start — let's go again from the top 👋");
        }
        if (isFollowupCmd(text)) {
          await sendMessengerText(psid, FOLLOWUP_TEXT);
          await admin.from("whatsapp_sessions").update({ followup_sent: true, followup_at: new Date().toISOString() }).eq("phone", psid);
          continue;
        }

        const { data: row } = await admin.from("whatsapp_sessions").select("*").eq("phone", psid).maybeSingle();
        const now = new Date().toISOString();
        const firstSeen = row?.first_seen_at ?? now;
        const booked = !!(row?.booked_at || row?.booked_url || row?.stage === "booked");
        const stage = booked ? "booked" : row?.stage ?? "new";

        const { out: flowOut, state, fallback } = runFlow({ stage, people: row?.people ?? null }, text, psid);
        let out = flowOut;
        if (fallback) {
          let ai = "";
          try {
            ai = await aiFallbackReply(text, state.stage, {
              booked,
              history: (row?.messages ?? []) as { role: string; content: string }[],
              bookedUrl: row?.booked_url ?? null,
              bookedStart: row?.booked_start ?? null,
              bookedTz: row?.booked_tz ?? null,
              people: row?.people ?? null,
            });
          } catch {
            ai = "";
          }
          const defaultText =
            booked || state.stage === "booked"
              ? "Happy to help! 🙌 The real cases we solve best on our call — anything specific you want me to prep for you?"
              : state.stage === "awaiting_booking"
              ? `Love that question — the call is the easiest place to answer it properly 🙂 Grab a 15-min slot here:\n\n${CAL_BOOKING_URL}`
              : `Happy to help! Easiest way to get real answers is a quick call — here's the slot:\n\n${CAL_BOOKING_URL}`;
          out = [{ kind: "text", text: ai || defaultText }];
        }
        await sendOuts(psid, out);

        const history = (row?.messages ?? []) as { role: string; content: string }[];
        history.push({ role: "user", content: text }, { role: "assistant", content: out.map((o) => o.text).join(" | ") });
        await admin.from("whatsapp_sessions").upsert(
          {
            phone: psid,
            channel: "messenger",
            channel_id: psid,
            messages: history.slice(-40),
            stage: state.stage,
            people: state.people,
            first_seen_at: firstSeen,
            updated_at: now,
          },
          { onConflict: "phone" }
        );
      } catch (e) {
        console.error("[messenger] handler failed:", (e as Error).message);
      }
    }
  }
  return NextResponse.json({ status: "ok" });
}
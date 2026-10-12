// WhatsApp qualification flow — fully deterministic (no AI needed = the best
// "cache" possible). Written in Julian's voice: human, casual, helpful, not salesy.
// Any unexpected free text falls back to a polite "let's cover it on the call".
import { calBookingLink } from "@/lib/whatsapp";

export type WaOut =
  | { kind: "text"; text: string }
  | { kind: "buttons"; text: string; buttons: { id: string; title: string }[] }
  | { kind: "list"; text: string; rows: { id: string; title: string; description?: string }[] };

export interface FlowState {
  stage: string;
  people: number | null;
}

function isYes(t: string): boolean {
  const s = t.trim().toLowerCase().replace(/\s+/g, "");
  return s.includes("yes") && !s.includes("no");
}

function isNo(t: string): boolean {
  return /(^|[^a-z])no/.test(t.trim().toLowerCase());
}

// Shared booking-time formatter: uses the attendee/event timezone when known,
// else the ISO offset embedded in startTime, else server time (UTC).
export function formatBookingTime(raw?: string | null, tz?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  if (tz) {
    try {
      return d.toLocaleString("en-GB", { ...opts, timeZone: tz });
    } catch {}
  }
  const m = raw.match(/([+-])(\d{2}):(\d{2})$/);
  if (m) {
    const sign = m[1] === "+" ? 1 : -1;
    const offMin = sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
    return new Date(d.getTime() + offMin * 60_000).toLocaleString("en-GB", opts);
  }
  return d.toLocaleString("en-GB", opts);
}

export function parsePeople(t: string): number | null {
  const s = t.trim().toLowerCase().replace(/[\s.]+/g, "");
  if (/^1$|^one$|^just\s*me/i.test(s)) return 1;
  if (/^2[-–]?5$|^2$|^3$|^4$|^5$|^2to5/i.test(s)) return 4;
  if (/^10[-–]?20$|^10$|^15$|^20$|^10to20/i.test(s)) return 15;
  if (/^20\+$|^20plus|^25$|^30$|^more\s*than\s*20/i.test(s)) return 25;
  return null;
}

export function runFlow(current: FlowState, text: string, phone?: string): { out: WaOut[]; state: FlowState; fallback: boolean } {
  const stage = current.stage || "new";
  const def = (out: WaOut[], state: Partial<FlowState>): { out: WaOut[]; state: FlowState; fallback: boolean } => ({
    out,
    state: { stage, people: current.people, ...state },
    fallback: false,
  });
  const isFallback = (state: FlowState) => ({ out: [] as WaOut[], state, fallback: true });

  // ── First message ever: thank-you + owner/manager question ──
  if (stage === "new") {
    return def(
      [
        {
          kind: "list",
          text: "Hey! Julian here from Sari 👋 Thanks for reaching out 🙌 Quick one before I tell you more: are you the owner or manager of a BPO/VA agency?",
          rows: [
            { id: "yes", title: "✅ Yes" },
            { id: "no", title: "❌ No" },
          ],
        },
      ],
      { stage: "ask_owner", people: null }
    );
  }

  // ── Owner / manager question ──
  if (stage === "ask_owner") {
    if (isYes(text)) {
      return def(
        [
          {
            kind: "list",
            text: "Perfect, that's what I hoped to hear 🙌 And roughly how many people does your team manage?",
            rows: [
              { id: "1", title: "Just me (1)" },
              { id: "2-5", title: "2–5" },
              { id: "10-20", title: "10–20" },
              { id: "20+", title: "20+" },
            ],
          },
        ],
        { stage: "ask_people", people: null }
      );
    }
    if (isNo(text)) {
      return def(
        [
          {
            kind: "text",
            text: "Ah, got it! 👌 Right now we focus on established BPO/VA agencies — that's where we can really move the needle. But thanks for reaching out! If you know a larger company that could use this, point them my way — you'd even get a referral commission (depends on deal size, happy to explain on a quick call 🙂).",
          },
        ],
        { stage: "done", people: null }
      );
    }
    return def(
      [
        {
          kind: "list",
          text: "Just to make sure I understand — are you the owner or manager of a BPO/VA agency? 🙏",
          rows: [
            { id: "yes", title: "✅ Yes" },
            { id: "no", title: "❌ No" },
          ],
        },
      ],
      { stage: "ask_owner", people: null }
    );
  }

  // ── Team size ──
  if (stage === "ask_people") {
    const people = parsePeople(text);
    if (people === 1) {
      return def(
        [
          {
            kind: "text",
            text: "Got it 👍 — right now we focus on agencies with a team behind them, since that's where our tools make the most sense. But I'm glad you reached out! If you know a larger operation that could use this, send them my way — there's a referral bonus in it for you 👀",
          },
        ],
        { stage: "done", people: 1 }
      );
    }
    if (people && people >= 2) {
      return def(
        [
          {
            kind: "text",
            text: `That's exactly the sweet spot we love working with 🙌 Let's get you on a quick 15-minute call — no pressure, we'll just look at your setup and what makes sense:\n\n${calBookingLink(phone)}`,
          },
        ],
        { stage: "awaiting_booking", people }
      );
    }
    return def(
      [
        {
          kind: "list",
          text: "Sorry, I didn't catch that — roughly how many people does your team manage?",
          rows: [
            { id: "1", title: "Just me (1)" },
            { id: "2-5", title: "2–5" },
            { id: "10-20", title: "10–20" },
            { id: "20+", title: "20+" },
          ],
        },
      ],
      { stage: "ask_people", people: null }
    );
  }

  // ── Booked: "no" to the follow-up → reschedule gracefully with the link ──
  if (stage === "booked" && isNo(text)) {
    return def(
      [
        {
          kind: "text",
          text: `No problem at all 🙂 Just grab a new slot whenever it suits you — here's the link:\n\n${calBookingLink()}`,
        },
      ],
      { stage, people: current.people }
    );
  }

  // ── After invite / done: ANY free text → human AI fallback. ──
  return isFallback({ stage, people: current.people });
}

// Messages used by the Cal.com webhook (after a booking exists).
export const BOOKING_CONFIRMED_TEXT =
  "You're booked! 🙌 Thanks — see you there. If you can have your key software subscriptions & rough numbers handy, we can dig right in and figure out what actually helps. (You'll get the calendar invite by email too — this is just the WhatsApp heads-up 👋)";

export const FOLLOWUP_TEXT =
  "Hey 🙂 quick one from my side — I just want to make sure we're still good for the call. Any questions you want me to prep properly for? And you'll for sure be there, right? (Does the time still work?)";
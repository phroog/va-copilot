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
  const s = t.trim().toLowerCase();
  return /^(yes|ja|yep|yup|sure|absolutely|yeah|confirmed)/.test(s);
}

function isNo(t: string): boolean {
  const s = t.trim().toLowerCase();
  return /^(no|nope|nein|nah)/.test(s);
}

export function parsePeople(t: string): number | null {
  const s = t.trim().toLowerCase().replace(/[\s.]+/g, "");
  if (/^1$|^one$|^just\s*me/i.test(s)) return 1;
  if (/^2[-–]?5$|^2$|^3$|^4$|^5$|^2to5/i.test(s)) return 4;
  if (/^10[-–]?20$|^10$|^15$|^20$|^10to20/i.test(s)) return 15;
  if (/^20\+$|^20plus|^25$|^30$|^more\s*than\s*20/i.test(s)) return 25;
  return null;
}

export function runFlow(current: FlowState, text: string, phone?: string): { out: WaOut[]; state: FlowState } {
  const stage = current.stage || "new";

  // ── First message ever: thank-you + owner/manager question ──
  if (stage === "new") {
    return {
      out: [
        {
          kind: "buttons",
          text: "Hey! Julian here from Sari 👋 Thanks for reaching out 🙌 Quick one before I tell you more: are you the owner or manager of a BPO/VA agency?",
          buttons: [
            { id: "yes", title: "Yes" },
            { id: "no", title: "No" },
          ],
        },
      ],
      state: { stage: "ask_owner", people: null },
    };
  }

  // ── Owner / manager question ──
  if (stage === "ask_owner") {
    if (isYes(text)) {
      return {
        out: [
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
        state: { stage: "ask_people", people: null },
      };
    }
    if (isNo(text)) {
      return {
        out: [
          {
            kind: "text",
            text: "Ah, got it! 👌 Right now we focus on established BPO/VA agencies — that's where we can really move the needle. But thanks for reaching out! If you know a larger company that could use this, point them my way — you'd even get a referral commission (depends on deal size, happy to explain on a quick call 🙂).",
          },
        ],
        state: { stage: "done", people: null },
      };
    }
    return {
      out: [
        {
          kind: "buttons",
          text: "Just to make sure I understand — are you the owner or manager of a BPO/VA agency? 🙏",
          buttons: [
            { id: "yes", title: "Yes" },
            { id: "no", title: "No" },
          ],
        },
      ],
      state: { stage: "ask_owner", people: null },
    };
  }

  // ── Team size ──
  if (stage === "ask_people") {
    const people = parsePeople(text);
    if (people === 1) {
      return {
        out: [
          {
            kind: "text",
            text: "Got it 👍 — right now we focus on agencies with a team behind them, since that's where our tools make the most sense. But I'm glad you reached out! If you know a larger operation that could use this, send them my way — there's a referral bonus in it for you 👀",
          },
        ],
        state: { stage: "done", people: 1 },
      };
    }
    if (people && people >= 2) {
      return {
        out: [
          {
            kind: "text",
            text: `That's exactly the sweet spot we love working with 🙌 Let's get you on a quick 15-minute call — no pressure, we'll just look at your setup and what makes sense:\n\n${calBookingLink(phone)}`,
          },
        ],
        state: { stage: "awaiting_booking", people },
      };
    }
    return {
      out: [
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
      state: { stage: "ask_people", people: null },
    };
  }

  // ── After invite / done: any question → helpful fallback → call ──
  return {
    out: [
      {
        kind: "text",
        text:
          stage === "awaiting_booking"
            ? "Love that question — that's honestly exactly what the call is for, so I can give you a proper answer instead of guessing here 🙂 Grab a 15-min slot and we'll go through it:\n\n" + calBookingLink(phone)
            : "Happy to help! The best place for real answers is a quick 15-min call — I'll make sure it's worth your time 🙂\n\n" + calBookingLink(phone),
      },
    ],
    state: { stage, people: current.people },
  };
}

// Messages used by the Cal.com webhook (after a booking exists).
export const BOOKING_CONFIRMED_TEXT =
  "You're booked! 🙌 Thanks — see you there. If you can have your key software subscriptions & rough numbers handy, we can dig right in and figure out what actually helps. (You'll get the calendar invite by email too — this is just the WhatsApp heads-up 👋)";

export const FOLLOWUP_TEXT =
  "Hey — quick one before our call 🙂 Any questions you want me to prep properly for? And just to make sure: you'll be there right? (Does the time still work for you?)";
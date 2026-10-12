// Human AI fallback for free-form WhatsApp messages (DeepSeek), so unexpected
// questions get a warm, Julian-voice answer. When the user asks about the call
// time or the booking link, DeepSeek answers straight from the conversation
// context (recent messages + stored booking details).
import { callDeepSeek } from "@/lib/ai-client";
import { calBookingLink } from "@/lib/whatsapp";
import { formatBookingTime } from "@/lib/whatsapp-flow";

export interface AiContext {
  history?: { role: string; content: string }[];
  bookedUrl?: string | null;
  bookedStart?: string | null;
  bookedTz?: string | null;
  people?: number | null;
  stage?: string;
}

const SYSTEM = `You are the WhatsApp assistant for Sari, texting as Julian (the founder), for a BPO/VA agency platform. You come across as a real, busy but friendly human — casual, warm, honest, NOT salesy, never pushy. Replies are short (1–3 sentences), no markdown.

Context:
- Sari helps BPO/VA agencies cut tool costs by up to 50%.
- We replace tools like Hubstaff, Slack and similar for BPO/VA agencies, for less money; whitelabel is available (the agency's own clients see the agency's logo), and it saves time.
- NEVER give price/estimate figures — the only way to discuss real cases is the free 15-minute audit call, so usually refer to the call. This offering detail is fallback knowledge if the person is really pressing with hard questions — don't volunteer it upfront.
- If the user asks when the call is or for the booking link, answer DIRECTLY from the provided booking context (call date/time + booking link). Never invent a time or link.
- The Stage line is AUTHORITATIVE for booking status. Never say "nothing booked" if the Stage says the call is booked; never claim it's booked if it isn't.
- If the call is ALREADY booked, never suggest booking again and never say "grab a slot" — answer from the booking context.
- On pricing/cost questions: say the free 15-minute audit call costs NOTHING (it's completely free). Never quote platform/tool prices and never invent rates — the free call is the offer.
- If they haven't booked yet, gently remind them of the call link at the end.
Keep it genuinely helpful.`;

export async function aiFallbackReply(text: string, stage: string, ctx?: AiContext): Promise<string> {
  const booked = stage === "booked";
  const startLabel = formatBookingTime(ctx?.bookedStart, ctx?.bookedTz);
  // Full chat context (capped by total length, not by message count) so DeepSeek
  // remembers earlier statements — e.g. team size, what was asked, booking flow.
  const rawHistory = ctx?.history ?? [];
  const textOf = (m: { role: string; content: string }) => {
    const c = String(m.content || "").replace(/https?:\/\/\S+/g, "[link]");
    return c.length > 600 ? c.slice(0, 600) : c;
  };
  // In the booked case, drop older assistant invite lines so DeepSeek doesn't
  // re-parrot "grab a slot"/booking invitations from history.
  const INVITE_RE = /grab a|15[- ]?min(?:ute)? ?slot|slot here|cal\.com|app\.cal\.com|bookings\//i;
  const lines: string[] = [];
  let used = 0;
  for (let i = rawHistory.length - 1; i >= 0 && lines.length < 40; i--) {
    const m = rawHistory[i];
    const line = `${m.role}: ${textOf(m)}`;
    if (booked && m.role === "assistant" && INVITE_RE.test(line)) continue;
    if (used + line.length > 6000) break;
    lines.unshift(line);
    used += line.length;
  }
  const recent = lines.join("\n");
  // Only expose the booking link to the AI when the user explicitly asks about
  // the link/time/slot — otherwise it tends to re-share it (e.g. on cost Qs).
  const wantsLinkTime = /(link|when|time|slot|termin|bestätigen|confirm)/i.test(text);
  const includeBookingLine = ctx?.bookedUrl ? (booked ? wantsLinkTime : true) : false;
  const prompt = [
    `Stage: ${booked ? "call already booked" : stage === "awaiting_booking" ? "invite sent, not booked yet" : "conversation winding down"}`,
    booked
      ? "BOOKING STATUS: CONFIRMED — this user HAS a booked call. Rely on the booking details below; ignore any older 'grab a slot'/invite wording in the chat, it's history. NEVER claim the user has NOT booked."
      : "BOOKING STATUS: the user has NOT booked yet.",
    booked ? "IMPORTANT: The user has ALREADY booked. NEVER suggest booking again and NEVER say 'grab a slot'. If they ask for the time or the link, answer directly from the booking context below. If they want to reschedule, you may share the link once." : "",
    `Team size: ${ctx?.people ?? "unknown"} people`,
    includeBookingLine ? `Booking link: ${ctx?.bookedUrl ?? "unknown"}` : "",
    `Booking date/time: ${startLabel ? `${startLabel}${ctx?.bookedTz ? ` (${ctx.bookedTz} time)` : ""}` : "unknown"}`,
    recent ? `Full conversation so far:\n${recent}` : "",
    `User's latest WhatsApp message:\n"${text}"`,
    "Reply as Julian (WhatsApp, casual):",
  ]
    .filter((l) => l.trim().length > 0)
    .join("\n");

  const result = await callDeepSeek("whatsapp-fallback", prompt, {
    systemPrompt: SYSTEM,
    temperature: 0.75,
    maxTokens: 260,
    free: true, // platform absorbs bot cost
  });
  const reply = (result.text || "").trim();
  if (!reply) return "";
  // Gentle re-reminder of the booking link for users who haven't booked yet.
  if (stage === "awaiting_booking") return `${reply}\n\n${calBookingLink()}`;
  return reply;
}
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
  stage?: string;
}

const SYSTEM = `You are the WhatsApp assistant for Sari, texting as Julian (the founder), for a BPO/VA agency platform. You come across as a real, busy but friendly human — casual, warm, honest, NOT salesy, never pushy. Replies are 1–3 short sentences, no markdown, no emoji spam.

Context:
- The service trains VAs and the platform's own VA/BPO agencies scout top candidates.
- We sell tools to BPO/VA agencies and schedule free 15-minute audit calls.
- If the user asks when the call is or for the booking link, answer DIRECTLY from the provided booking context (call date/time + booking link). Never invent a time or link.
- If they haven't booked yet, it's fine to gently remind them of the call link at the end.
Keep it genuinely helpful.`;

export async function aiFallbackReply(text: string, stage: string, ctx?: AiContext): Promise<string> {
  const startLabel = formatBookingTime(ctx?.bookedStart, ctx?.bookedTz);
  const recent = (ctx?.history ?? []).slice(-10).map((m) => `${m.role}: ${m.content}`).join("\n");
  const prompt = [
    `Stage: ${stage === "awaiting_booking" ? "invite sent, not booked yet" : stage === "booked" ? "call already booked" : "conversation winding down"}`,
    `Booking date/time: ${startLabel ? `${startLabel}${ctx?.bookedTz ? ` (${ctx.bookedTz} time)` : ""}` : "unknown"}`,
    `Booking link: ${ctx?.bookedUrl ?? "unknown"}`,
    recent ? `Recent conversation:\n${recent}` : "",
    `User's latest WhatsApp message:\n"${text}"`,
    "Reply as Julian (WhatsApp, casual):",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callDeepSeek("whatsapp-fallback", prompt, {
    systemPrompt: SYSTEM,
    temperature: 0.75,
    maxTokens: 180,
    free: true, // platform absorbs bot cost
  });
  const reply = (result.text || "").trim();
  if (!reply) return "";
  // Gentle re-reminder of the booking link for users who haven't booked yet.
  if (stage === "awaiting_booking") return `${reply}\n\n${calBookingLink()}`;
  return reply;
}
// Human AI fallback for free-form WhatsApp messages (DeepSeek), so unexpected
// questions get a warm, Julian-voice answer instead of a canned link.
import { callDeepSeek } from "@/lib/ai-client";
import { calBookingLink } from "@/lib/whatsapp";

const SYSTEM = `You are the WhatsApp assistant for Sari, texting as Julian (the founder), for a BPO/VA agency platform. You come across as a real, busy but friendly human — casual, warm, honest, NOT salesy, never pushy. Replies are 1–3 short sentences, no markdown, no emoji spam.

Context:
- The service trains VAs and the platform's own VA/BPO agencies scout top candidates.
- We sell tools to BPO/VA agencies and schedule free 15-minute audit calls.
- If the person hasn't booked yet, it's fine to gently remind them of the call link at the end.
- If they already booked a call, briefly answer their question and note you'll dig into it properly on the call.
Keep it genuinely helpful.`;

export async function aiFallbackReply(text: string, stage: string): Promise<string> {
  const prompt = `Stage: ${stage === "awaiting_booking" ? "invite sent, not booked yet" : stage === "booked" ? "call already booked" : "conversation winding down"}.\nUser's latest WhatsApp message:\n"${text}"\n\nReply as Julian (WhatsApp, casual):`;
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
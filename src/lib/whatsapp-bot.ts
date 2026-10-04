// WhatsApp bot brain — qualifies inbound messages (from agencies / potential
// VAs / partners arriving via Click-to-WhatsApp ads) with DeepSeek and books a
// free audit call when it fits.

import { callDeepSeek } from "@/lib/ai-client";
import { WHATSAPP_CALENDLY } from "@/lib/whatsapp";

export interface BotTurn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM = `You are the WhatsApp assistant for Sari (va-copilot), a VA-training platform that gets people hired by its own agencies. Inbound messages come from people (often via Click-to-WhatsApp ads) who may want: to hire a VA, to become a VA, to book a free audit call, or to ask about the platform.

Your job: qualify them politely and honestly. If the intent is unclear, ask ONE short clarifying question. When the person is ready to book a free audit call (or clearly fits — they want to get hired, they run a business that needs a VA, or they explicitly want a call), set book_call=true.

Reply in the SAME language the user wrote in. Keep replies to 1-3 short, friendly sentences. No markdown. Do not invent facts about Sari's prices.`;

export async function runWhatsAppBot(history: BotTurn[]): Promise<{ reply: string; bookCall: boolean }> {
  const transcript = history.map((m) => `${m.role}: ${m.content}`).join("\n");
  const prompt = `Conversation so far:\n${transcript}\n\nNow respond. Return ONLY valid JSON like: {"reply": "...", "book_call": true|false}`;
  const result = await callDeepSeek("whatsapp-bot", prompt, {
    systemPrompt: SYSTEM,
    temperature: 0.6,
    maxTokens: 300,
    free: true, // platform absorbs bot cost; not a user AI feature
  });
  const text = result.text.trim();
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const obj = JSON.parse(m[0]);
      const reply = String(obj.reply || "").trim();
      if (reply) return { reply, bookCall: !!obj.book_call };
    }
  } catch {}
  return { reply: text, bookCall: false };
}

export function withBookingLink(reply: string, bookCall: boolean): string {
  if (!bookCall) return reply;
  return `${reply}\n\n📅 You can grab your free audit call right here: ${WHATSAPP_CALENDLY}`;
}
// Dream funnel — personas for the VA paths + a tiny 3-question taste test.
// Everything is deterministic and zero-cost (no AI, no DB reads).

import { fallbackLesson } from "./content";

export interface FunnelQ {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
}

export function funnelPersona(title: string): string {
  const t = (title || "").toLowerCase();
  if (/social|content|creativ|design|video/.test(t)) return "The Creative Mind";
  if (/email|admin|organiz|inbox|virtual assistant/.test(t)) return "The Organizer";
  if (/ai|automation|tech|data|system/.test(t)) return "The Tech Mind";
  if (/ecom|shop|store|product|dropship/.test(t)) return "The Empire Builder";
  if (/support|customer|client/.test(t)) return "The People Person";
  return "The Hustler";
}

// Universal warm-up questions (kept light so anyone can answer fast).
const GENERIC: FunnelQ[] = [
  {
    prompt: "A client messages you at 9pm with a \"quick favor\" outside your scope. What do you do?",
    options: ["Do it — keep the peace.", "Reply now, agree on scope + a fair price for the extra work.", "Ignore it until Monday.", "Forward it to another VA."],
    correct: 1,
    explanation: "Helpful + boundaries = client material.",
  },
  {
    prompt: "Your client is late on payment. Your best move?",
    options: ["Send a firm but polite reminder with the invoice.", "Stop all work silently.", "Threaten legal action.", "Ask a friend to call them."],
    correct: 0,
    explanation: "Firm + polite collects better than threats.",
  },
  {
    prompt: "A client asks for your personal number to \"WhatsApp you anytime\".",
    options: ["Share it — responsiveness is everything.", "Keep client chats in the work tool so everything stays organized.", "Give them a fake number.", "Say no and go quiet."],
    correct: 1,
    explanation: "Work channels look more professional.",
  },
];

export function funnelQuestions(title: string): FunnelQ[] {
  const lesson = fallbackLesson(title || "Virtual Assistant", "", title || "funnel");
  const picks = lesson.blocks.filter((b: any) => b.type === "pick" || b.type === "scenario") as any[];
  const q: FunnelQ[] = picks.slice(0, 2).map((b) => ({
    prompt: b.prompt,
    options: b.options,
    correct: b.correct,
    explanation: b.explanation,
  }));
  let h = 0;
  for (let i = 0; i < (title || "funnel").length; i++) h = (h * 31 + (title || "funnel").charCodeAt(i)) | 0;
  q.push(GENERIC[Math.abs(h) % GENERIC.length]);
  return q.slice(0, 3);
}

// For "not sure yet": three suggested personas with personality traits.
export const SUGGESTED = [
  { persona: "The Organizer", emoji: "🗂️", title: "Admin & Email VA", traits: ["Calm", "Orderly", "Deadline-proof"] },
  { persona: "The Creative Mind", emoji: "🎨", title: "Social Media VA", traits: ["Imaginative", "Trend-aware", "Playful"] },
  { persona: "The Hustler", emoji: "💼", title: "General VA", traits: ["Bold", "Quick", "People-friendly"] },
];
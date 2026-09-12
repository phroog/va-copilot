// Lesson content: schema validation, prompt, and a deterministic static
// fallback so a level can always be played even if the AI is unavailable
// (or before content is generated). All content is English.
import type { LessonContent, LessonBlock } from "./types";

// DeepSeek is instructed to return EXACTLY this JSON shape.
export const CONTENT_SCHEMA_DESCRIPTION = `{
  "title": "string",
  "intro": "string (1-2 punchy hook sentences)",
  "blocks": [
    {"type":"text","heading":"string","body":"string"},
    {"type":"tip","text":"string"},
    {"type":"pick","prompt":"string","options":["...","..."],"correct":0,"explanation":"string"},
    {"type":"fill","prompt":"string (contains ___ as the blank)","answers":["accepted answer"],"explanation":"string"},
    {"type":"order","prompt":"string","items":["first step","second step","..."],"explanation":"string"},
    {"type":"scenario","prompt":"string","options":["...","..."],"correct":0,"explanation":"string"},
    {"type":"reveal","label":"string","content":"string"}
  ],
  "takeaway": "string (one-line summary)"
}`;

export const CONTENT_SYSTEM_PROMPT = `You are Sari, the world's best VA trainer, building short interactive micro-lessons for complete beginners.
Write in simple, punchy English with real practical value. Make it fun, direct and confidence-boosting (Duolingo energy, but for becoming a virtual assistant and landing a job).
Rules:
- 4 to 7 blocks, at least 3 of them interactive (pick / fill / order / scenario).
- Exactly one block may be type "text" or "tip" between interactive ones; keep the rhythm fast.
- Questions must be beginner-level but teach something real, with a short, motivating explanation after each.
- "fill" prompts must contain exactly one "___" blank.
- "order" items are listed in the CORRECT order (the app shuffles them for the user).
- "correct" is the 0-based index of the right option.
- "scenario" is a short real-client situation where the user picks the best move.
Return ONLY valid JSON matching this schema, no markdown fences, no commentary:
${CONTENT_SCHEMA_DESCRIPTION}`;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function validateBlock(raw: unknown): LessonBlock | null {
  if (!isObj(raw)) return null;
  const type = asString(raw.type);
  if (type === "text") {
    const heading = asString(raw.heading);
    const body = asString(raw.body);
    if (!heading && !body) return null;
    return { type, heading, body };
  }
  if (type === "tip") {
    const text = asString(raw.text);
    if (!text) return null;
    return { type, text };
  }
  if (type === "reveal") {
    const label = asString(raw.label) || "Tap to reveal";
    const content = asString(raw.content);
    if (!content) return null;
    return { type, label, content };
  }
  if (type === "pick" || type === "scenario") {
    const prompt = asString(raw.prompt);
    const options = asStringArray(raw.options);
    if (!prompt || options.length < 2) return null;
    const correct = Math.min(Math.max(asNumber(raw.correct), 0), options.length - 1);
    return { type, prompt, options, correct, explanation: asString(raw.explanation) };
  }
  if (type === "fill") {
    const prompt = asString(raw.prompt);
    const answers = asStringArray(raw.answers);
    if (!prompt || answers.length === 0) return null;
    return { type, prompt, answers, explanation: asString(raw.explanation) };
  }
  if (type === "order") {
    const prompt = asString(raw.prompt);
    const items = asStringArray(raw.items);
    if (!prompt || items.length < 2) return null;
    return { type, prompt, items, explanation: asString(raw.explanation) };
  }
  return null;
}

// Parse + validate raw AI output into a LessonContent. Returns null if unusable.
export function parseLessonContent(raw: unknown): LessonContent | null {
  if (typeof raw === "string") {
    // strip code fences + anything before the first { and after the last }
    let s = raw.trim();
    s = s.replace(/```(?:json)?/gi, "");
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    s = s.slice(start, end + 1);
    try {
      raw = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (!isObj(raw)) return null;
  const title = asString(raw.title);
  const intro = asString(raw.intro);
  const takeaway = asString(raw.takeaway);
  const rawBlocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  const blocks = rawBlocks
    .map(validateBlock)
    .filter((b): b is LessonBlock => b !== null);

  const interactive = blocks.filter((b) => ["pick", "fill", "order", "scenario"].includes(b.type)).length;
  if (!title || blocks.length < 3 || interactive < 1) return null;

  return { title, intro, blocks, takeaway };
}

// Deterministic static fallback lesson built from a node/level title, so a
// level is always playable with zero AI cost. Keyed by seed so it's stable.
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function fallbackLesson(title: string, subtitle: string, seed: string): LessonContent {
  const h = hashSeed(seed);
  const intro = `Welcome to "${title}". ${subtitle ? subtitle + "." : ""} Master this and you are one step closer to landing your first client.`;
  const variants = [
    {
      pick: {
        prompt: "A client asks for something outside the agreed scope. What's the smartest first move?",
        options: [
          "Do it for free to keep them happy",
          "Politely confirm the scope and offer a quote for the extra work",
          "Ignore the request",
        ],
        correct: 1,
        explanation: "Scope creep is normal. Confirm the original agreement first, then offer the extra work at a fair price — that's how professionals protect their time.",
      },
    },
    {
      pick: {
        prompt: "You're unsure how to do a task the client assigned. Best move?",
        options: [
          "Guess and hope it works out",
          "Ask a clarifying question before starting",
          "Silently skip it",
        ],
        correct: 1,
        explanation: "A 30-second question saves hours of rework. Clients trust VAs who confirm the goal before they start.",
      },
    },
    {
      pick: {
        prompt: "A potential client asks your hourly rate. What's the strongest reply?",
        options: [
          "Whatever you want to pay",
          "State your rate with confidence and what it includes",
          "Avoid answering",
        ],
        correct: 1,
        explanation: "Confidence sells. A clear rate with the value you deliver positions you as a professional, not a discount.",
      },
    },
  ][h % 3];

  const fill = {
    prompt: "The fastest way to build client trust is to communicate early and ___. (one word)",
    answers: ["clearly", "often", "honestly", "proactively"],
    explanation: "Communication is a VA superpower. Early, clear updates make clients feel safe handing you more work.",
  };

  const order = {
    prompt: "Put these in the right order for starting a new client task:",
    items: [
      "Clarify the goal and deadline",
      "Do the work in a focused block",
      "Review it against the brief",
      "Deliver it with a short, clear update",
    ],
    explanation: "Clarify → do → review → deliver. This loop is the backbone of reliable VA work.",
  };

  const scenario = {
    prompt: "It's 5pm and your client messages about something urgent due tomorrow. You've logged off. What do you do?",
    options: [
      "Reply immediately and work late",
      "Quickly acknowledge and set expectations for the morning",
      "Ignore it until tomorrow afternoon",
    ],
    correct: 1,
    explanation: "A quick acknowledgement with a clear timeline respects both your client and your boundaries. That's sustainable professionalism.",
  };

  return {
    title,
    intro,
    blocks: [
      { type: "text", heading: "The core idea", body: `Every skill here comes down to one habit: be reliable, be clear, and always follow up. "${title}" is where you prove it.` },
      { type: "tip", text: "Professionals are remembered for how they communicate — not just what they deliver." },
      { type: "pick", ...variants.pick },
      { type: "fill", ...fill },
      { type: "order", ...order },
      { type: "scenario", ...scenario },
      { type: "reveal", label: "Tap for the pro tip", content: "Clients rarely fire a VA who communicates. Most complaints start with silence, not mistakes." },
    ],
    takeaway: `Be reliable, be clear, and always follow up — that is the "unfair advantage" of a great VA.`,
  };
}

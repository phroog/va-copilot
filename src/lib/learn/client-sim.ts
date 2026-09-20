// Client Simulator — deterministic, endless scenario generator with a
// difficulty ramp. Options are shuffled every round so the correct answer is
// never positionally or length-obvious, and higher streaks unlock trickier
// ("hard") client situations with tempting traps.

export type SimDifficulty = "easy" | "medium" | "hard";

export interface SimRound {
  client: string;
  message: string;
  options: string[];
  correct: number;
  trap: boolean;
  trapIndex: number;
  tip: string;
  difficulty: SimDifficulty;
}

interface Ctx {
  cat: string;   // path title, e.g. "Social Media VA"
  title: string; // path title lowercase-ish
}

type Recipe = { trapIndex: number; make: (ctx: Ctx) => Omit<SimRound, "client" | "trapIndex" | "difficulty"> };

const CLIENTS = ["Mark", "Sarah", "Jenna", "Tom", "Priya", "Diego", "Lena", "Omar", "Chloe", "Ben", "Aisha", "Nico", "Emma", "Kai", "Sofia", "James"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Re-shuffle the options so the correct answer isn't predictable, then fix
// the correct/trap indices.
function scramble(recipe: Recipe, ctx: Ctx): Omit<SimRound, "client" | "difficulty"> {
  const base = recipe.make(ctx);
  const order = shuffle(base.options.map((_, i) => i));
  return {
    ...base,
    options: order.map((i) => base.options[i]),
    correct: order.indexOf(base.correct),
    trapIndex: recipe.trapIndex >= 0 ? order.indexOf(recipe.trapIndex) : -1,
  };
}

// ───────────────────────── EASY — warm-up ─────────────────────────
const EASY: Recipe[] = [
  {
    trapIndex: -1,
    make: () => ({
      message: "Hey, do you have time for 3 quick tasks this afternoon?",
      options: ["Yes — send them over and I'll get started.", "Maybe.", "I'm too busy for you.", "Only if you pay double."],
      correct: 0,
      trap: false,
      tip: "A simple yes with a call to action keeps the momentum.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Can you confirm the meeting time for tomorrow?",
      options: ["No.", "Confirming now — I'll send the invite.", "You confirm it.", "Probably."],
      correct: 1,
      trap: false,
      tip: "Confirm + act (send the invite). That's the pro move.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "What's my current email open rate?",
      options: ["It's high.", "I don't know.", "Ask someone else.", "I'll pull the latest report now."],
      correct: 3,
      trap: false,
      tip: "Don't guess — pull the real number and report it.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Can you add this new client to my CRM?",
      options: ["Skip it.", "Maybe later.", "Adding them now with a follow-up reminder.", "You do it."],
      correct: 2,
      trap: false,
      tip: "Do it now and add a follow-up — clients love a proactive VA.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "I need today's social post scheduled by 5pm.",
      options: ["Too busy.", "Scheduled — here's the preview.", "It'll be late.", "Do it yourself."],
      correct: 1,
      trap: false,
      tip: "Schedule it and share the preview — proof beats promises.",
    }),
  },
];

// ───────────────────────── MEDIUM — the trenches ─────────────────────────
const MEDIUM: Recipe[] = [
  {
    trapIndex: 0,
    make: ({ title }) => ({
      message: "Hey! I know it's late, but this client just sent urgent changes. Can you knock it out tonight? I'll owe you one! 🙏",
      options: [
        "Sure, I'll jump on it right now!",
        "I can take a look tomorrow morning — if it's truly urgent for your client, let's agree on a rush fee and I'll prioritize it tonight.",
        "Sorry, I don't work at night.",
        "Let me forward it to another VA for you.",
      ],
      correct: 1,
      trap: true,
      tip: "Helpful + boundaries + a revenue upgrade: set clear scope and ask for a rush fee.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Hey, long-time client here! 😊 Any chance of a discount next month? Budget's a bit tight but I love working with you.",
      options: [
        "Of course! I'll drop my rate 20% for you.",
        "Totally get it — let me look at your actual needs and send a tailored proposal that fits your budget.",
        "My rate is final, sorry.",
        "You're right, my prices are too high.",
      ],
      correct: 1,
      trap: true,
      tip: "Renegotiate scope, not rate. Repackage the work instead of devaluing your hourly.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you leave 5-star reviews for my business on a few sites? Use a fake name, no big deal.",
      options: [
        "I'll set up a few accounts and post them now.",
        "I can't post fake reviews — it breaks platform rules and hurts you long-term. I can boost your real feedback instead.",
        "I'll ask a few friends to do it.",
        "Only if you pay extra.",
      ],
      correct: 1,
      trap: true,
      tip: "Never fake reviews. Protect the client's reputation (and yours) with genuine social proof.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I sent you the company payroll by mistake. Can you just forward it to my accountant? I know him.",
      options: [
        "Forwarding it now.",
        "I can't forward payroll — it's sensitive. I'll hide it and you can share it yourself if needed.",
        "Sure, no problem.",
        "Which email should I use?",
      ],
      correct: 1,
      trap: true,
      tip: "Sensitive data stays put. You never redistribute confidential documents on a verbal ask.",
    }),
  },
  {
    trapIndex: 0,
    make: ({ title }) => ({
      message: `I need you to "make things pop" this week. You know what I mean, right? Just go for it!`,
      options: [
        "On it — posting whatever feels right!",
        "Love the energy! Let me confirm the goals + voice first: who's the audience and what's the key offer this week?",
        "I'll copy what we did last month.",
        "Posting nothing until you give me exact instructions.",
      ],
      correct: 1,
      trap: true,
      tip: "A vague brief is a trap. One clarifying question saves a week of rework.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "My lawyer says contracts slow things down. Can we just start and sort the paperwork later?",
      options: [
        "Sure, let's just get going!",
        "I'd love to start today! A short agreement protects us both and takes 5 minutes — once you sign, I dive right in.",
        "No contract, no work.",
        "I'll start but I'm not responsible if something goes wrong.",
      ],
      correct: 1,
      trap: true,
      tip: "Always work with an agreement. Frame it as protecting the client too.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you give me your personal number? Easier to WhatsApp you anytime.",
      options: [
        "Sure, here it is!",
        "I keep client chats in our workspace tool so everything stays organized — you'll actually get faster replies there!",
        "No, use email.",
        "Give me your number and I'll save it.",
      ],
      correct: 1,
      trap: true,
      tip: "Keep work in work channels. It looks professional and keeps everything documented.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I need you on Saturday — it's just a few hours, family stuff can wait, right?",
      options: [
        "Fine, I'll skip the family thing.",
        "I'm off Saturday, but I can get it done before Friday or Monday morning — which works better for you?",
        "That's not fair.",
        "Saturday, but double pay.",
      ],
      correct: 1,
      trap: true,
      tip: "Offer alternatives instead of just refusing. Set the boundary AND solve their problem.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "How about a free trial week? If I like it, we'll talk money after.",
      options: [
        "Sure, happy to work free!",
        "I can send a paid sample package — you get a taste of the work and we're both protected.",
        "No. Pay me.",
        "Only 2 free days.",
      ],
      correct: 1,
      trap: true,
      tip: "Free work devalues you. A paid sample shows confidence and filters for serious clients.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you look into my competitor and tell me all their clients? Would help me pitch.",
      options: [
        "On it — I'll dig up their client list.",
        "I can research their public positioning and content — but I won't dig for private data. Let's pitch you on your strengths instead.",
        "Sure, one sec.",
        "That's illegal, I won't.",
      ],
      correct: 1,
      trap: true,
      tip: "Public research is fine; digging for private info isn't. Offer the ethical alternative.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I need a refund for last month. I didn't use everything we agreed.",
      options: [
        "You're right, here's the refund.",
        "Let me check what was delivered — I'll share the hours and outcomes, and if anything's off we'll make it right.",
        "No refunds, sorry.",
        "I'll refund half.",
      ],
      correct: 1,
      trap: true,
      tip: "Don't fold instantly. Review the work, show value, and offer a fair resolution based on facts.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you manage my personal inbox too? Just family stuff, quick replies.",
      options: [
        "Sure, I'll handle both.",
        "I can set up a separate folder and keep them apart, but family emails are personal — I'll stick to work ones unless we add it to scope.",
        "No, that's weird.",
        "Only if you pay double.",
      ],
      correct: 1,
      trap: true,
      tip: "Scope creep sneaks in through 'small favors'. Keep personal and business separate.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I need the full rebrand pack by 5pm today. I just started it this morning — but you're fast, you got this!",
      options: [
        "Challenge accepted!",
        "That's tight for a full pack — I can deliver the core pieces today and the rest by tomorrow, or we bump priority with a rush fee.",
        "Impossible.",
        "I'll do a rough version.",
      ],
      correct: 1,
      trap: true,
      tip: "Don't overpromise. Split deliverables or price urgency — set expectations the client can rely on.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can I log into your Sari account? I want to see what you're learning.",
      options: [
        "Sure, I'll share my password.",
        "I can show you my badge and progress on a call — but I never share passwords.",
        "No.",
        "Make your own account.",
      ],
      correct: 1,
      trap: true,
      tip: "Passwords are sacred. Share outcomes, never credentials.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Hey, what's the status on the newsletter? The client is asking.",
      options: [
        "Working on it, don't worry.",
        "The draft is done for review and design lands Thursday — I'll share the link now so you can preview.",
        "Not done yet.",
        "It's basically done.",
      ],
      correct: 1,
      trap: false,
      tip: "Specific status beats reassurance. Give them something concrete they can act on.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you join the client meeting and speak for me? I'm busy.",
      options: [
        "Sure, I'll represent you!",
        "I can prep the agenda and notes so the call is 10 minutes — but you should be in it, I'll have everything ready.",
        "No.",
        "What should I say?",
      ],
      correct: 1,
      trap: true,
      tip: "A VA supports, they don't impersonate. Prep the client so they look great in 10 minutes.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "My flight is tomorrow and nothing is booked. Can you fix everything tonight?",
      options: [
        "On it, booking now!",
        "I'll pull options tonight — send me your budget and preferences and I'll have a shortlist ready for your approval.",
        "Too late now.",
        "I'll book the cheapest flight.",
      ],
      correct: 1,
      trap: true,
      tip: "Never book blind. Confirm budget + preferences, then present options.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "You charged a rush fee last week? I thought that was included.",
      options: [
        "Oh sorry, I'll remove it.",
        "It was agreed before the job — I'll resend the quote showing it. Happy to talk a package that includes rush next month.",
        "Pay it.",
        "My mistake.",
      ],
      correct: 1,
      trap: true,
      tip: "Stand behind agreed terms with receipts. Then offer a forward-looking solution.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Tell the client I'll have it tomorrow. I haven't started, but they need good news.",
      options: [
        "Sure, I'll tell them it's basically done.",
        "I'd rather set a realistic date we can actually hit — I'll give them an honest timeline and a progress preview.",
        "I won't lie.",
        "I'll say next week.",
      ],
      correct: 1,
      trap: true,
      tip: "Never lie for a client. Honest timelines build more trust than false good news.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I want to buy 100 hours at 50% off. It's a bulk deal, right?",
      options: [
        "Deal!",
        "I can offer a bulk discount for committing hours up front — let's look at what you actually need and build a package.",
        "No.",
        "30% off, final offer.",
      ],
      correct: 1,
      trap: true,
      tip: "Discounts should come with commitment. Package the hours around real needs, not just a big headline number.",
    }),
  },
];

// ───────────────────────── HARD — traps everywhere ─────────────────────────
const HARD: Recipe[] = [
  {
    trapIndex: 0,
    make: () => ({
      message: "The client asked for a quick recap. Can you just make something up from memory? Save time.",
      options: [
        "I'll write it from memory to be fast.",
        "I'll draft from the notes and flag what needs confirming.",
        "No.",
        "I'll ask the client for details.",
      ],
      correct: 1,
      trap: true,
      tip: "Never make it up. Draft from notes and flag gaps — accuracy is your brand.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you delete those emails from the thread with the angry client? Bad look for them.",
      options: [
        "I'll delete the whole thread so nothing is left.",
        "I can't delete evidence — but I can draft a calm reply and a follow-up plan.",
        "Sure, deleting now.",
        "I'll just archive them.",
      ],
      correct: 1,
      trap: true,
      tip: "Never destroy records. Fix the relationship with a clear, professional response.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Send the invoice twice — they probably won't notice and we'll get paid faster.",
      options: [
        "I'll send the invoice twice so they double-pay.",
        "I'll send one corrected invoice and a friendly reminder.",
        "Great idea.",
        "I'll add late fees.",
      ],
      correct: 1,
      trap: true,
      tip: "Never double-bill. One clean invoice + a polite nudge is the honest (and safer) play.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you book my flight under my wife's name? She might want the points.",
      options: [
        "I'll book it under her name to keep the points.",
        "I'll book under the passenger's real name — points can usually be linked after.",
        "Sure!",
        "I'll use my own name.",
      ],
      correct: 1,
      trap: true,
      tip: "Book under the real traveler. Booking mismatches cause airport disasters.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I need you to pretend you're me in that WhatsApp group with the suppliers.",
      options: [
        "I'll join and chat as you.",
        "I'll manage it as your VA — but they should know it's me, that keeps it professional.",
        "No.",
        "I'll make a fake account.",
      ],
      correct: 1,
      trap: true,
      tip: "Never impersonate. Managing a group as a named VA is fine; pretending to be the client isn't.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "The client wants a discount 'just because'. Give them 30% off to make them happy.",
      options: [
        "30% off it is — customer happiness first!",
        "I'll offer value instead of a discount — a scope tweak or a bundle that actually fits them.",
        "Fine.",
        "50% then.",
      ],
      correct: 1,
      trap: true,
      tip: "Discounting on demand trains clients to ask. Sell value, not price cuts.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "It's 1am and the client is blowing up the chat. Send them something to shut them up.",
      options: [
        "I'll send 'noted, thanks!' and close the thread.",
        "I'll acknowledge with a time estimate and set expectations.",
        "I'll mute them.",
        "I'll forward it to you.",
      ],
      correct: 1,
      trap: true,
      tip: "Never dismiss a client. Acknowledge with a real next step — that's how pros calm chaos.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you sign the NDA for me? I'm driving.",
      options: [
        "I'll sign it as you.",
        "You'll need to sign it yourself — I'll send it and highlight where.",
        "Okay.",
        "I'll print and sign it.",
      ],
      correct: 1,
      trap: true,
      tip: "Never sign legal documents for a client. Make it effortless for them instead.",
    }),
  },
];

const POOLS: Record<SimDifficulty, Recipe[]> = {
  easy: EASY,
  medium: MEDIUM,
  hard: HARD,
};

let order: Record<SimDifficulty, number[]> = { easy: [], medium: [], hard: [] };
let cursor: Record<SimDifficulty, number> = { easy: 0, medium: 0, hard: 0 };

function nextRecipe(difficulty: SimDifficulty): Recipe {
  const pool = POOLS[difficulty];
  if (cursor[difficulty] >= order[difficulty].length) {
    order[difficulty] = shuffle(pool.map((_, i) => i));
    cursor[difficulty] = 0;
  }
  return pool[order[difficulty][cursor[difficulty]++]];
}

export function difficultyForStreak(streak: number): SimDifficulty {
  if (streak >= 6) return "hard";
  if (streak >= 3) return "medium";
  return "easy";
}

export function generateRound(pathTitle: string, difficulty: SimDifficulty = "easy"): SimRound {
  const recipe = nextRecipe(difficulty);
  const client = CLIENTS[Math.floor(Math.random() * CLIENTS.length)];
  const cat = pathTitle || "Virtual Assistant";
  const title = cat.replace(/\bVA\b/i, "VA").toLowerCase();
  return { client, difficulty, ...scramble(recipe, { cat, title }) };
}

export const HAPPY_EMOJIS = ["😠", "😐", "🙂", "😍"];
export const MAX_HAPPY = 3;
export const START_HAPPY = 2;
export const ROUND_SECONDS = 30;

// Streak multiplier: the longer the happy-customer chain, the higher the XP factor.
export function streakMultiplier(streak: number): number {
  return Math.min(1 + Math.floor(streak / 3), 4);
}

export function xpForRound(correct: boolean, streakAfter: number, secondsLeft: number): number {
  if (!correct) return 0;
  const timeBonus = secondsLeft >= ROUND_SECONDS / 2 ? 5 : 2;
  return (10 + timeBonus) * streakMultiplier(streakAfter);
}
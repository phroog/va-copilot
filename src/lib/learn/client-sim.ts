// Client Simulator — deterministic, endless scenario generator.
// Each round is a WhatsApp-style client message with reply options.
// Some rounds contain a "trap": a tempting option that is actually wrong
// (the mode is supposed to be a little treacherous).

export interface SimRound {
  client: string;
  message: string;
  options: string[];
  correct: number;
  trap: boolean;
  trapIndex: number;
  tip: string;
}

interface Ctx {
  cat: string;   // path title, e.g. "Social Media VA"
  title: string; // path title lowercase-ish
}

type Recipe = { happy: number; trapIndex: number; make: (ctx: Ctx) => Omit<SimRound, "client" | "trapIndex"> };

const CLIENTS = ["Mark", "Sarah", "Jenna", "Tom", "Priya", "Diego", "Lena", "Omar", "Chloe", "Ben", "Aisha", "Nico", "Emma", "Kai", "Sofia", "James"];

const RECIPES: Recipe[] = [
  {
    happy: 1,
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
      tip: "Helpful + boundaries + a revenue upgrade: set clear scope and ask for a rush fee. That's how pros handle scope creep without burning out.",
    }),
  },
  {
    happy: 1,
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
      tip: "Renegotiate scope, not rate. Repackage the work so it fits their budget instead of devaluing your hourly.",
    }),
  },
  {
    happy: 1,
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
      tip: "Never fake reviews. Protect the client's reputation (and yours) by building genuine social proof.",
    }),
  },
  {
    happy: 1,
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
      tip: "Sensitive data stays put. You can help, but you never redistribute confidential documents on a verbal ask.",
    }),
  },
  {
    happy: 1,
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
      tip: "A vague brief is a trap. One clarifying question saves a week of rework and shows you think like a strategist.",
    }),
  },
  {
    happy: 1,
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
      tip: "Always work with an agreement. Frame it as protecting the client too — pros never skip this.",
    }),
  },
  {
    happy: 1,
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
    happy: 1,
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
      tip: "Offer alternatives instead of just refusing. You set the boundary AND solve their problem.",
    }),
  },
  {
    happy: 1,
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
    happy: 1,
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
    happy: 1,
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
      tip: "Don't fold instantly. Review the work, show value delivered, and offer a fair resolution based on facts.",
    }),
  },
  {
    happy: 1,
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
    happy: 1,
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
      tip: "Don't overpromise. Split deliverables or price urgency — a pro sets expectations the client can rely on.",
    }),
  },
  {
    happy: 1,
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
    happy: 1,
    trapIndex: 0,
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
      trapIndex: -1,
      tip: "Specific status beats reassurance. Give them something concrete they can act on.",
    }),
  },
  {
    happy: 1,
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
    happy: 1,
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
      tip: "Never book blind. Confirm budget + preferences, then present options. Fast + careful beats fast + sloppy.",
    }),
  },
  {
    happy: 1,
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
    happy: 1,
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
    happy: 1,
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let order: number[] = [];
let cursor = order.length;

function nextRecipe(): Recipe {
  if (cursor >= order.length) {
    order = shuffle(RECIPES.map((_, i) => i));
    cursor = 0;
  }
  return RECIPES[order[cursor++]];
}

export function generateRound(pathTitle: string): SimRound {
  const recipe = nextRecipe();
  const client = CLIENTS[Math.floor(Math.random() * CLIENTS.length)];
  const cat = pathTitle || "Virtual Assistant";
  const title = cat.replace(/\bVA\b/i, "VA").toLowerCase();
  return { client, trapIndex: recipe.trapIndex, ...recipe.make({ cat, title }) };
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
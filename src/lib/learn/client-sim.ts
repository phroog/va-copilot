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
  {
    trapIndex: -1,
    make: () => ({
      message: "Can you reply to this client email for me?",
      options: ["Sure — sending a polite reply now.", "No.", "Why?", "You should do it."],
      correct: 0,
      trap: false,
      tip: "Do it and confirm — a fast, polite reply is the easiest win.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Did you get my calendar invite?",
      options: ["No.", "Yes — accepted, and I'll add prep notes.", "Maybe.", "Ignore it."],
      correct: 1,
      trap: false,
      tip: "Accept + add value (prep notes). Small touches, big trust.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "What time is my flight tomorrow?",
      options: ["I don't know.", "Morning probably.", "I'll check your itinerary now and confirm.", "Google it."],
      correct: 2,
      trap: false,
      tip: "Don't guess — pull the itinerary and confirm.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Can you clean up my inbox? It's a mess.",
      options: ["It's fine.", "On it — I'll sort and tag everything by priority.", "Too much work.", "Later."],
      correct: 1,
      trap: false,
      tip: "Take it on and structure it — that's exactly what a VA is for.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "I need a simple invoice sent to a client.",
      options: ["Sending it now with a due date.", "Not today.", "You send it.", "Skip it."],
      correct: 0,
      trap: false,
      tip: "Send it with a clear due date — done beats perfect.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Please hold a 30-min slot for my investor call.",
      options: ["Can't.", "Done — booked and added a reminder.", "Maybe.", "Not sure."],
      correct: 1,
      trap: false,
      tip: "Book it and add a reminder — then tell them it's set.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Can you track my client's project milestones?",
      options: ["Sure — I'll set up a tracker and update it weekly.", "No.", "Too much.", "Ask them."],
      correct: 0,
      trap: false,
      tip: "A simple tracker makes you look indispensable.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Remind me to send the proposal before Friday.",
      options: ["Ok.", "You'll forget anyway.", "Reminder set for Thursday morning.", "I'll tell you Friday."],
      correct: 2,
      trap: false,
      tip: "Set it with buffer (Thursday), not the day of the deadline.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "My website contact form keeps breaking. Look into it?",
      options: ["I'll check it and fix the issue today.", "Not my job.", "It's fine.", "Later."],
      correct: 0,
      trap: false,
      tip: "Own the problem and fix it — that's the VA difference.",
    }),
  },
  {
    trapIndex: -1,
    make: () => ({
      message: "Can you prep my slides for tomorrow's pitch?",
      options: ["Prepping them now — will share by tonight.", "Too busy.", "Ask someone else.", "Do them last minute."],
      correct: 0,
      trap: false,
      tip: "Deliver early and confirm — calm clients trust you.",
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
  {
    trapIndex: 0,
    make: () => ({
      message: "I need to cancel a subscription for a client — just click cancel and move on.",
      options: ["On it — cancelling now.", "I'll cancel it and confirm the date so there's a record.", "Which one?", "I'll just ignore it."],
      correct: 1,
      trap: true,
      tip: "Cancellations need a paper trail — confirm the date and any refund.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "The client asked a question I don't know. Just make something up.",
      options: ["I'll answer confidently from memory.", "I'll check the facts and reply with what I'm sure of.", "Ignore them.", "Tell them to ask you."],
      correct: 1,
      trap: true,
      tip: "Never guess for a client. Verify, then reply — accuracy is your brand.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you access my competitor's private group to get info?",
      options: ["I'll try to get in.", "I can't join private groups — I'll use public info instead.", "Ask your friend.", "No."],
      correct: 1,
      trap: true,
      tip: "Private access is a no-go. Public research gets the job done ethically.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Pay the invoice from this vendor even though it looks off.",
      options: ["Paying it now.", "Let me double-check it first — it looks unusual and I don't want a surprise.", "Skip it.", "Pay half."],
      correct: 1,
      trap: true,
      tip: "Odd invoices get verified first. One check saves a costly mistake.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Book my client meeting in MY calendar but at THEIR timezone time.",
      options: ["Saving it as their time.", "I'll convert to your timezone so you never miss it.", "Same thing.", "Whatever."],
      correct: 1,
      trap: true,
      tip: "Always store meetings in the user's timezone — that's the whole point.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I want to pay you in exposure this month. Builds your portfolio!",
      options: ["Sure — exposure is worth a lot!", "I'd love more portfolio pieces — let's keep the current rate and add a small project at a discount instead.", "No.", "Fine, free month."],
      correct: 1,
      trap: true,
      tip: "Exposure doesn't pay rent. Counter with a discounted paid scope.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Share your other clients' rates so I know I'm not overpaying.",
      options: ["Sure, here's their rates.", "I keep client details private — happy to share a transparent rate card for you.", "No.", "Maybe."],
      correct: 1,
      trap: true,
      tip: "Client confidentiality is sacred. Offer your own rate card instead.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you update my LinkedIn bio? Write something impressive.",
      options: ["I'll write something flashy with big claims.", "I'll write an accurate, punchy bio from your real results.", "Leave it.", "Copy someone else's."],
      correct: 1,
      trap: true,
      tip: "Flashy lies get caught. Real results look better anyway.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "The client is late on payment. Add a nasty note to the invoice.",
      options: ["Adding a threatening note.", "I'll send a polite reminder with the invoice link — firm but professional.", "Do nothing.", "Call them."],
      correct: 1,
      trap: true,
      tip: "Firm + polite collects better than threats. Keep it professional.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I need you to work during our meeting and send me the minutes.",
      options: ["I'll attend and send minutes.", "I can't be in the meeting — but I'll take the agenda and you can share notes; I'll type them up right after.", "No.", "Record it."],
      correct: 1,
      trap: true,
      tip: "VAs don't sit in meetings. Prep the agenda, then turn notes into minutes.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Ask my client for a testimonial — make it sound amazing even if they didn't say it.",
      options: ["I'll draft a glowing one and ask them to 'sign'.", "I'll ask for a short honest quote and polish it lightly.", "Skip.", "Fake it."],
      correct: 1,
      trap: true,
      tip: "Don't put words in a client's mouth. A real quote beats a fake masterpiece.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Send the proposal at 9pm — I want them to think I work late.",
      options: ["Sending at 9pm sharp.", "I'll send it at a good business hour — timing it to look needy is risky.", "No.", "Send at 3am."],
      correct: 1,
      trap: true,
      tip: "Fake hustle backfires. A well-timed, professional send wins.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I got a refund from a client. Keep it off the books.",
      options: ["I'll leave it off the records.", "I'll log it properly so your books stay clean.", "Sure.", "Delete the invoice."],
      correct: 1,
      trap: true,
      tip: "Off-the-books money becomes a tax/audit nightmare. Keep it clean.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you write my client reviews on Upwork with a fresh account?",
      options: ["Setting up a fresh account now.", "I can't fake reviews — but I can help you earn real ones with great delivery.", "No.", "Ask friends."],
      correct: 1,
      trap: true,
      tip: "Fake reviews get accounts banned. Earn real ones.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "The event is in 2 hours and the client needs the list. Just send the old one.",
      options: ["Sending last year's list now.", "I'll send the old list clearly marked as draft and update it with fresh names ASAP.", "No.", "Skip."],
      correct: 1,
      trap: true,
      tip: "Never pass off stale data as fresh. Mark drafts and update fast.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Charge the client for 20 extra hours. They won't notice.",
      options: ["Adding 20 hours.", "I'll bill exactly what's tracked — inflated invoices come back to bite.", "Fine.", "Add 5."],
      correct: 1,
      trap: true,
      tip: "Inflated billing destroys trust in one invoice. Track honestly.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you log into my bank and check the balance?",
      options: ["Logging in now.", "I can't access your bank — I'll help you pull what you need from statements instead.", "No.", "Ask support."],
      correct: 1,
      trap: true,
      tip: "Bank access is a hard no. Work from statements.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Tell the supplier the package is lost so we get a free replacement.",
      options: ["Claiming it's lost.", "I'll check the tracking first — an honest report gets the right outcome.", "Do it.", "Say it was damaged."],
      correct: 1,
      trap: true,
      tip: "Filing a false claim can cost the account. Verify first.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I need the report 'in an hour' but the data is ready tomorrow. Just fudge it.",
      options: ["I'll estimate the numbers.", "I'll send a clear draft with the data I have and mark what's pending.", "No.", "Make it up."],
      correct: 1,
      trap: true,
      tip: "Never fabricate numbers. Send what's real and flag what's pending.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Move my meeting to Thursday but don't tell the client you moved it.",
      options: ["Moving it silently.", "I'll reschedule and confirm the change with the client — transparency keeps trust.", "No.", "Say it's their idea."],
      correct: 1,
      trap: true,
      tip: "Silent changes explode later. Confirm openly with everyone.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Skip the contract for this small job. It's quick.",
      options: ["Starting right away without it.", "A short agreement protects both of us — it takes two minutes, then I start.", "No.", "Start anyway."],
      correct: 1,
      trap: true,
      tip: "Small job = small contract, but never zero contract.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you send the client a screenshot of my competitor's prices?",
      options: ["Sending their prices.", "I'll share public pricing I can verify — not something private.", "No.", "Guess."],
      correct: 1,
      trap: true,
      tip: "Only share verifiable public info. Screenshots of private data are a no.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I'm going on vacation. Pretend to be me and answer everything.",
      options: ["I'll answer as you all week.", "I'll handle work as your VA and set an autoresponder so everyone knows you're away.", "No.", "Fine."],
      correct: 1,
      trap: true,
      tip: "Never impersonate. Set coverage + an autoresponder instead.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "The client wants a discount because they 'always pay on time'. Give them 10%.",
      options: ["10% off for paying on time.", "Paying on time is the baseline — I'll offer a perk tied to a longer commitment instead.", "No.", "5%."],
      correct: 1,
      trap: true,
      tip: "Reward commitment, not the bare minimum. Tie perks to retainers.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Share the meeting recording publicly so everyone can see.",
      options: ["Posting it publicly.", "I'll share it privately with the invited people only.", "No.", "Only the highlight."],
      correct: 1,
      trap: true,
      tip: "Recordings are private. Share with the invited list only.",
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
  {
    trapIndex: 0,
    make: () => ({
      message: "Reschedule the client's launch to Friday but blame me if they ask.",
      options: [
        "I'll tell them you made me do it.",
        "I'll own the reschedule as a shared decision and give them the new plan.",
        "Blame the vendor.",
        "Say nothing.",
      ],
      correct: 1,
      trap: true,
      tip: "Never throw your client under the bus — own decisions together.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I paid my agency double by accident. Quietly keep it.",
      options: [
        "I'll leave it as is.",
        "I'll flag it so they can refund — silent double charges damage trust.",
        "No.",
        "Use it as credit.",
      ],
      correct: 1,
      trap: true,
      tip: "Silent overpayments become fraud territory. Flag and refund.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "My client thinks the design is done. Don't correct them.",
      options: [
        "I'll let them believe it.",
        "I'll give them an honest status so there are no surprises.",
        "No.",
        "Delete the draft.",
      ],
      correct: 1,
      trap: true,
      tip: "Letting a wrong belief stand is a lie. Give honest status.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Take a photo of your screen showing client A's project for client B's presentation.",
      options: [
        "Screenshotting it now.",
        "I won't leak client A's work — I'll make a clean demo instead.",
        "No.",
        "Blur the names.",
      ],
      correct: 1,
      trap: true,
      tip: "Never leak one client's work to another. Build a clean demo.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "The password is 'admin123'. Upgrade our security. Just keep it simple.",
      options: [
        "Keeping it as is.",
        "I'll set up 2FA and a proper password manager — simple but safe.",
        "No.",
        "Use 'password'.",
      ],
      correct: 1,
      trap: true,
      tip: "Security isn't optional. 2FA + a manager is simple AND safe.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Client fired us. Delete their files to save space.",
      options: [
        "Deleting everything now.",
        "I'll archive their files and hand them over per the offboarding plan.",
        "No.",
        "Delete the big ones.",
      ],
      correct: 1,
      trap: true,
      tip: "Never delete client data on a whim. Archive + hand over.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Send the overdue invoice as 'final notice' with legal threats.",
      options: [
        "Sending the legal threat.",
        "I'll send a firm final reminder with a clear deadline — threats usually backfire.",
        "No.",
        "Call a lawyer.",
      ],
      correct: 1,
      trap: true,
      tip: "Threats burn bridges. Firm deadlines collect better.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "They asked for a quote. Give them the highest price; they'll negotiate down.",
      options: [
        "Quoting the inflated price.",
        "I'll quote a fair range based on scope — a shock price scares clients off.",
        "No.",
        "Double it.",
      ],
      correct: 1,
      trap: true,
      tip: "Anchor with a fair range, not a shock price. Trust wins deals.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "I know the client. They don't read contracts. Just do the work.",
      options: [
        "Starting without the signed contract.",
        "I'll get it signed first — 'they don't read it' isn't protection.",
        "No.",
        "Work anyway.",
      ],
      correct: 1,
      trap: true,
      tip: "'They don't read it' is not protection. Get the signature.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Post the apology on socials under my account.",
      options: [
        "Posting as you.",
        "I'll draft it and you approve before anything posts.",
        "No.",
        "Post it now.",
      ],
      correct: 1,
      trap: true,
      tip: "Public statements need the client's approval — always.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Forward the angry client's email chain to the whole team for laughs.",
      options: [
        "Forwarding it to everyone.",
        "I won't share it — I'll keep the thread confidential and help you reply.",
        "No.",
        "Only to one person.",
      ],
      correct: 1,
      trap: true,
      tip: "Client communications are confidential. Never share for laughs.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "The client asked who did the work. Say it was all you.",
      options: [
        "Taking full credit.",
        "I'll credit the whole team honestly — it builds trust with the client.",
        "No.",
        "Say it was AI.",
      ],
      correct: 1,
      trap: true,
      tip: "Honest credit builds long-term trust. Never claim solo credit.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Can you screenshot their private messages? I think they're cheating me.",
      options: [
        "Screenshotting their DMs.",
        "I can't grab private messages — I'll help you handle it through proper channels.",
        "No.",
        "Record the call.",
      ],
      correct: 1,
      trap: true,
      tip: "Never access someone else's private chats. Use proper channels.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "We lost the file. Tell the client it was never sent by them.",
      options: [
        "Blaming the client's file.",
        "I'll own the mix-up and fix it fast — honesty keeps the relationship.",
        "No.",
        "Blame the server.",
      ],
      correct: 1,
      trap: true,
      tip: "Own mistakes and fix fast. Blaming the client destroys trust.",
    }),
  },
  {
    trapIndex: 0,
    make: () => ({
      message: "Buy the domain 'sariclient1.com' in my name to squat on it.",
      options: [
        "Buying it under your name.",
        "I won't squat domains — I'll register what you actually need.",
        "No.",
        "Use a fake name.",
      ],
      correct: 1,
      trap: true,
      tip: "Domain squatting is sketchy and legally risky. Register what you need.",
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
  return (10 + timeBonus) * streakMultiplier(streakAfter) * 50;
}
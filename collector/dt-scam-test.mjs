import { scamScore } from "../src/lib/jobs/scam-score.ts";

const cases = [
  ["Legit VA Upwork", { title: "Virtual Assistant for Inbox Management", description: "Manage email inbox and calendar for a US consulting firm. Full job description with details about responsibilities, tools, and reporting.", platform: "Upwork", budget: "$15-$20/hr" }],
  ["Scam fee upfront", { title: "Data Entry Agent", description: "Get paid $500/day! No experience needed. Send $50 processing fee via Western Union to secure your slot. Contact me on Telegram.", platform: "Upwork", budget: "$500/day" }],
  ["Reddit forhire MLM", { title: "Make Money at Home", description: "Unlimited earning potential! Recruit your own team, passive income, guaranteed salary. Message me on WhatsApp.", platform: "Reddit", budget: "" }],
  ["Short vague high budget", { title: "URGENT hire now", description: "Start immediately, huge pay.", platform: "Freelancer", budget: "$250000" }],
  ["Legit reddit post", { title: "[For Hire] VA - admin, email, scheduling", description: "Experienced VA offering admin support, email management, scheduling. 3 years experience with US clients. Payment via escrow.", platform: "Reddit", budget: "$20/hr" }],
];

for (const [n, j] of cases) {
  const r = scamScore(j);
  console.log(n.padEnd(28), r.level.padEnd(7), String(r.risk).padStart(3), "|", r.flags.join("; "));
}

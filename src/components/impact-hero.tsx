"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/* Psychologically charged hero: a glowing, vibrating CTA in the middle,
   surrounded by 8 provocative problem → Sari-solution boxes.
   Desktop: perfect 3×3 ring with the CTA dead center.
   Mobile: CTA on top, boxes in a 2-col grid below. */

const BOXES = [
  {
    emoji: "🌪️",
    problem: "14 tabs open. 3 job boards. 0 replies.",
    fix: "Over 1,000 real-time jobs a day, one feed — faster than everyone.",
    tag: "⚡ 1,000+ jobs / day",
  },
  {
    emoji: "📉",
    problem: "Copy-paste pitches go straight to spam.",
    fix: "AI pitches tuned per client — ~30% higher acceptance.",
    tag: "🚀 +30% acceptance",
  },
  {
    emoji: "🎭",
    problem: "“Great offer, just pay the fee” — scam.",
    fix: "Sari flags fake clients before you waste a week.",
    tag: "🛡️ Scam-proof",
  },
  {
    emoji: "🔄",
    problem: "You refresh. Refresh. Refresh. Nothing.",
    fix: "Newest matches auto-land in your list every day.",
    tag: "🔁 Auto-matched",
  },
  {
    emoji: "🤑",
    problem: "Great freelancers. Terrible payers.",
    fix: "Invoices with compliance check — get paid safely.",
    tag: "💸 Paid safely",
  },
  {
    emoji: "⏰",
    problem: "Top jobs get taken in minutes.",
    fix: "Real-time alerts mean you apply first, not last.",
    tag: "⚡ Real-time alerts",
  },
  {
    emoji: "🙈",
    problem: "Missed follow-up = dead deal.",
    fix: "Sari never lets a client slip through the cracks.",
    tag: "🔔 No slip-ups",
  },
  {
    emoji: "👥",
    problem: "Your competitors are already using it.",
    fix: "2000+ freelancers trust Sari to win clients.",
    tag: "👥 2000+ users",
  },
];

function StatBox({ box, delay }: { box: (typeof BOXES)[number]; delay: number }) {
  return (
    <div
      className="h-full rounded-3xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/40 dark:border-dark-surface p-4 sm:p-5 shadow-sari-sm animate-float hover:shadow-sari hover:border-kawaii-purple/50 transition-all"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{box.emoji}</span>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-kawaii-purple dark:text-kawaii-lavender">
          {box.tag}
        </span>
      </div>
      <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 leading-snug line-through decoration-kawaii-coral/70">
        {box.problem}
      </p>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1.5 leading-snug">
        {box.fix}
      </p>
    </div>
  );
}

export default function ImpactHero() {
  return (
    <section className="relative px-4 pt-6 sm:pt-24 pb-20 sm:pb-28">
      <div className="max-w-6xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-kawaii-lavender/30 dark:bg-dark-surface text-xs sm:text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender">
            🚨 Real talk: scrolling alone won't pay your bills
          </span>
        </div>

        {/* Headline — compact on mobile so the CTA stays above the fold */}
        <h1 className="text-center text-3xl sm:text-6xl lg:text-7xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
          Without Sari,{" "}
          <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
            you're scrolling
          </span>{" "}
          into oblivion.
        </h1>
        <p className="text-center mt-3 text-base sm:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto">
          Sari hands you <b>matching jobs</b>, <b>AI pitches</b> and <b>scam protection</b> —
          so you can actually get paid.
        </p>

        {/* Mobile: compact CTA right away, then boxes */}
        <div className="lg:hidden mt-6 text-center">
          <Link href="/start">
            <Button className="w-full max-w-sm text-base px-8 py-3.5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink hover:from-kawaii-purple hover:to-kawaii-coral text-white font-extrabold">
              🚀 Start earning now
            </Button>
          </Link>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
            <span>✨ No credit card</span>
            <span>🛡️ Cancel anytime</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {BOXES.map((box, i) => (
              <StatBox key={box.tag} box={box} delay={i * 0.15} />
            ))}
          </div>
        </div>

        {/* Desktop: 3×3 ring with CTA center */}
        <div className="hidden lg:grid grid-cols-3 gap-5 mt-14 items-stretch">
          {BOXES.slice(0, 4).map((box, i) => (
            <StatBox key={box.tag} box={box} delay={i * 0.3} />
          ))}

          {/* CTA center cell */}
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-kawaii-purple/50 dark:border-kawaii-lavender/40 bg-gradient-to-br from-kawaii-purple/15 to-kawaii-pink/10 dark:from-kawaii-purple/20 dark:to-kawaii-pink/10 p-8 text-center animate-pop-in">
            <span className="text-4xl mb-3 inline-block animate-vibrate">⚡</span>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">
              Stop scrolling. Start earning.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Free trial. No credit card. 2-minute setup.
            </p>
            <Link href="/start" className="w-full">
              <Button className="w-full text-base px-8 py-3.5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink hover:from-kawaii-purple hover:to-kawaii-coral text-white font-extrabold">
                🚀 Start earning now
              </Button>
            </Link>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
              <span>✨ No credit card</span>
              <span>🛡️ Cancel anytime</span>
            </div>
          </div>

          {BOXES.slice(4).map((box, i) => (
            <StatBox key={box.tag} box={box} delay={i * 0.3 + 0.5} />
          ))}
        </div>

        {/* urgency strip */}
        <div className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-slate-400 dark:text-slate-500">
          <span>🕒 Every hour = lost opportunity</span>
          <span>💰 Top VA jobs get taken in minutes</span>
          <span>🥊 Without Sari, you're fighting with one hand</span>
        </div>
      </div>
    </section>
  );
}
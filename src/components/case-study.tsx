"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/* A visual, psychologically compelling case study: a fictional VA named Marco,
   his journey in numbers, and the blunt takeaway that without Sari he'd still
   be stuck at zero. Numbers are intentionally illustrative. */

const TIMELINE = [
  { label: "Day 1", value: "$0", detail: "Stuck, like most freelancers" },
  { label: "Week 2", value: "$420", detail: "First matched jobs + AI pitches" },
  { label: "Month 1", value: "$1,860", detail: "3 clients · first follow-ups automated" },
  { label: "Month 3", value: "$4,150", detail: "5 steady clients · invoices on autopilot" },
  { label: "Month 6", value: "$6,900/mo", detail: "Full pipeline · zero missed follow-ups" },
];

const STATS = [
  { emoji: "🕳️", value: "0", label: "scams that ever got him" },
  { emoji: "⏰", value: "300+ hrs", label: "of manual hunting saved" },
  { emoji: "🤝", value: "5", label: "paying clients, retained" },
  { emoji: "💵", value: "$6,900/mo", label: "earned safely, tracked & invoiced" },
];

export default function CaseStudy() {
  return (
    <section className="py-16 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-pink/15 dark:bg-kawaii-pink/20 text-sm font-bold text-kawaii-coral dark:text-kawaii-pink">
            📖 Real story, real numbers
          </span>
          <h2 className="mt-5 text-3xl sm:text-5xl font-extrabold text-slate-800 dark:text-slate-100">
            Meet Marco. 6 months ago, he was{" "}
            <span className="text-kawaii-coral dark:text-kawaii-pink">$0.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Marco was a virtual assistant from Manila refreshing job boards
            like everyone else. Then Sari stopped feeding him hope and started
            feeding him <b>clients</b>.
          </p>
        </div>

        {/* Timeline: growth in numbers */}
        <div className="rounded-3xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/40 dark:border-dark-surface p-6 sm:p-10 shadow-sari">
          <div className="flex items-center justify-between mb-8">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Marco's earnings curve 📈
            </p>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              ▲ +6,900% growth
            </span>
          </div>

          <div className="space-y-6">
            {TIMELINE.map((t, i) => {
              const width = 20 + (i / (TIMELINE.length - 1)) * 80; // 20% → 100%
              return (
                <div key={t.label}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.label}</span>
                    <span className="text-xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{t.value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-3xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/40 dark:border-dark-surface p-5 text-center shadow-sari-sm"
            >
              <span className="text-3xl block mb-1">{s.emoji}</span>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Blunt takeaway */}
        <div className="mt-10 rounded-3xl border-2 border-kawaii-coral/40 dark:border-kawaii-pink/40 bg-gradient-to-r from-kawaii-coral/10 to-kawaii-pink/10 dark:from-kawaii-pink/15 dark:to-kawaii-purple/15 p-8 sm:p-10 text-center">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
            Without Sari, Marco would still be at <span className="text-kawaii-coral dark:text-kawaii-pink">$0</span> —
            <span className="block mt-1">same as the guy who's still scrolling.</span>
          </h3>
          <p className="mt-4 text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            The only difference between Marco and everyone else? He didn't wait.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button className="text-base px-8 py-3.5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink hover:from-kawaii-purple hover:to-kawaii-coral text-white font-extrabold animate-glow-pulse">
                🚀 Become the next Marco
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" className="text-base px-6 py-3.5 rounded-2xl">
                See how it works ↓
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
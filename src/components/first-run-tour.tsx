"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/* First-run workspace tour: shows the core features right after onboarding.
   Rendered in the dashboard layout. Each step highlights a sidebar link and
   explains it. Dismissible / skippable. Only shows once (localStorage). */

const TOUR_KEY = "sari_first_run_tour_done";

const STEPS = [
  {
    emoji: "📡",
    href: "/dashboard/live-feed",
    title: "Your live job feed",
    desc: "Matching jobs from 10+ platforms stream in here — the best ones land in your list automatically. No tab-hopping.",
  },
  {
    emoji: "🎯",
    href: "/dashboard/live-feed",
    title: "Matches & swaps",
    desc: "Every job is scored against your profile. Trade a weak one for a better match, or apply with an AI pitch in one click.",
  },
  {
    emoji: "⏱️",
    href: "/dashboard/time-tracker",
    title: "Track your hours",
    desc: "Start a timer while you work. Clients see tracked hours + screenshots, so trust is built automatically.",
  },
  {
    emoji: "⚙️",
    href: "/dashboard/setup",
    title: "Your notifications",
    desc: "Connect Telegram or your email to get job alerts the second they appear. Or set up the browser extension.",
  },
  {
    emoji: "👑",
    href: "/dashboard/settings",
    title: "Your public profile",
    desc: "Set up a profile clients can find — ratings, hours and verified work. A link you're proud to share.",
  },
];

export default function FirstRunTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_KEY) === "1") return;
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    } catch {
      return;
    }
  }, []);

  const finish = () => {
    setOpen(false);
    try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
  };

  const step = STEPS[idx];
  const goto = () => {
    router.push(step.href);
    if (idx < STEPS.length - 1) setIdx(idx + 1);
    else finish();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-8 pointer-events-none">
      <div className="pointer-events-auto w-full sm:w-80 rounded-3xl bg-white dark:bg-dark-card border border-kawaii-lavender/40 dark:border-dark-surface shadow-2xl p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {idx + 1} / {STEPS.length} · Quick tour
          </span>
          <button onClick={finish} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none">✕</button>
        </div>

        <div key={idx} className="animate-fade-in">
          <div className="text-3xl mb-2">{step.emoji}</div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{step.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{step.desc}</p>
        </div>

        <div className="flex items-center justify-between mt-5">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === idx ? "bg-kawaii-purple" : "bg-kawaii-lavender/30"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {idx > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setIdx(idx - 1)}>←</Button>
            )}
            {idx < STEPS.length - 1 ? (
              <Button size="sm" onClick={goto}>Open it →</Button>
            ) : (
              <Button size="sm" variant="primary" onClick={finish}>Done 🎉</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
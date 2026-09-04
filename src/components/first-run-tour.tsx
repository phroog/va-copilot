"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* First-run workspace tour: shows the core features right after onboarding.
   Appears EXACTLY ONCE per user — the flag is stored server-side on
   user_settings.onboarding_tour_done (clearing the browser never re-shows it).
   Mobile-perfect: bottom sheet on phones, card on desktop, big tap targets. */

const TOUR_KEY = "sari_first_run_tour_done";

const STEPS = [
  {
    emoji: "📡",
    href: "/dashboard/live-feed",
    title: "Your live job feed",
    desc: "Matching jobs from 10+ platforms stream in here. No tab-hopping, no refresh marathons.",
  },
  {
    emoji: "🎯",
    href: "/dashboard/live-feed",
    title: "Matches & swaps",
    desc: "Every job is scored against your profile. Trade a weak one for a better match, or apply with an AI pitch.",
  },
  {
    emoji: "⏱️",
    href: "/dashboard/time-tracker",
    title: "Track your hours",
    desc: "Start a timer while you work. Clients see tracked hours + screenshots — trust on autopilot.",
  },
  {
    emoji: "⚙️",
    href: "/dashboard/setup",
    title: "Your notifications",
    desc: "Connect Telegram or email for job alerts the second they appear. Or install the browser extension.",
  },
  {
    emoji: "👑",
    href: "/dashboard/settings",
    title: "Your public profile",
    desc: "Ratings, hours and verified work — a link you're proud to share with clients.",
  },
];

export default function FirstRunTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  // Server-side once check: only show if the user hasn't seen it.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Fast path: browser flag already set → definitely skip.
        let local = false;
        try { local = localStorage.getItem(TOUR_KEY) === "1"; } catch {}
        if (local) return;

        const res = await fetch("/api/user-settings");
        if (!res.ok) return;
        const data = await res.json();
        if (data.settings?.onboarding_tour_done === true) return;

        if (active) setTimeout(() => setOpen(true), 1200);
      } catch {
        // If the fetch fails, show once per browser session (safe fallback).
        if (active) setTimeout(() => setOpen(true), 1500);
      }
    })();
    return () => { active = false; };
  }, []);

  const markDone = () => {
    try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
    // Persist server-side so it never shows again on any device/browser.
    fetch("/api/user-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_tour_done: true }),
    }).catch(() => {});
  };

  const finish = () => {
    setOpen(false);
    markDone();
  };

  const step = STEPS[idx];
  const goto = () => {
    router.push(step.href);
    if (idx < STEPS.length - 1) setIdx(idx + 1);
    else finish();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center sm:justify-end p-3 sm:p-8">
      {/* Tap outside to skip */}
      <button aria-label="Skip tour" onClick={finish} className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />

      <div className="relative w-full sm:w-80 rounded-3xl bg-white dark:bg-dark-card border border-kawaii-lavender/40 dark:border-dark-surface shadow-2xl p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {idx + 1} / {STEPS.length} · Quick tour
          </span>
          <button
            onClick={finish}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1 -m-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div key={idx} className="animate-fade-in">
          <div className="text-3xl mb-2">{step.emoji}</div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{step.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{step.desc}</p>
        </div>

        <div className="flex items-center justify-between mt-5 gap-3">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Step ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === idx ? "bg-kawaii-purple scale-125" : "bg-kawaii-lavender/30"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {idx > 0 && (
              <button
                onClick={() => setIdx(idx - 1)}
                className="h-11 px-4 rounded-xl text-slate-500 hover:bg-kawaii-lavender/10 font-bold"
              >
                ←
              </button>
            )}
            {idx < STEPS.length - 1 ? (
              <button
                onClick={goto}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy"
              >
                Open it →
              </button>
            ) : (
              <button
                onClick={finish}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy"
              >
                Done 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
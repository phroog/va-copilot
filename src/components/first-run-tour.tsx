"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* First-run workspace tour — the "wow" tour.
   Shows the real features (live feed, AI pitches, scam check, tracking, profile,
   notifications) with visuals, then a closing CTA (upgrade vs. continue free).
   Appears EXACTLY ONCE per user (server-side flag on user_settings). */

const TOUR_KEY = "sari_first_run_tour_done";

interface TourStep {
  emoji: string;
  accent: string;
  title: string;
  desc: string;
  href: string;
  pill?: string;
  mock?: { tag: string; lines: string[] };
}

const STEPS: TourStep[] = [
  {
    emoji: "📡",
    accent: "from-kawaii-purple to-kawaii-pink",
    title: "Your jobs find you",
    desc: "Matching jobs from 10+ platforms stream into one live feed — no tab-hopping, no refresh marathons.",
    href: "/dashboard/live-feed",
    pill: "1000+ jobs/day",
    mock: { tag: "LIVE FEED", lines: ["✉️ E-Commerce VA · 🎯 97%", "📧 Email Manager · 🎯 92%", "📅 Calendar Support · 🎯 88%"] },
  },
  {
    emoji: "🤖",
    accent: "from-kawaii-pink to-kawaii-coral",
    title: "AI pitches that win",
    desc: "One click → a tailored pitch written for that exact client. You sound brilliant — it's our little secret.",
    href: "/dashboard/live-feed",
    pill: "~30% higher acceptance",
    mock: { tag: "AI PITCH", lines: ["Hi [Client], I handle inboxes so you can focus on growth…", "✨ Polished · tailored · ready to send"] },
  },
  {
    emoji: "🛡️",
    accent: "from-kawaii-coral to-kawaii-peach",
    title: "Scam check before you waste a week",
    desc: "Paste a client, URL or payment info — Sari scores the risk in seconds and flags the scammers.",
    href: "/dashboard/scam-check",
    pill: "Fake clients flagged",
    mock: { tag: "SCAM CHECK", lines: ["🔴 95% — wire transfer + upfront fee", "🟢 8% — normal job posting"] },
  },
  {
    emoji: "⏱️",
    accent: "from-kawaii-purple to-kawaii-lavender",
    title: "Track & prove your work",
    desc: "Start a timer while you work. Clients see tracked hours + screenshots — trust on autopilot.",
    href: "/dashboard/time-tracker",
    pill: "Trust on autopilot",
    mock: { tag: "TIME TRACKER", lines: ["⏱ 02:14:37 · Project: Client X", "📸 3 screenshots attached"] },
  },
  {
    emoji: "⚙️",
    accent: "from-kawaii-lavender to-kawaii-pink",
    title: "Alerts that never sleep",
    desc: "Connect Telegram or email to get high-match jobs pushed the second they appear.",
    href: "/dashboard/setup",
    pill: "Instant alerts",
    mock: { tag: "NOTIFICATIONS", lines: ["Telegram: on · Email: evening digest"] },
  },
  {
    emoji: "👑",
    accent: "from-kawaii-pink to-kawaii-purple",
    title: "A profile you brag about",
    desc: "Ratings, hours and verified work — a link you send clients with pride.",
    href: "/dashboard/settings",
    pill: "Shareable link",
    mock: { tag: "PUBLIC PROFILE", lines: ["⭐ 4.9 · ✅ 12 jobs · 🛡️ Verified"] },
  },
];

const MOCKS = [
  { emoji: "🤖", title: "AI Pitch", desc: "A tailored pitch for every client — written for you, ready to send.", href: "/dashboard/live-feed", accent: "from-kawaii-pink to-kawaii-coral" },
  { emoji: "🛡️", title: "Scam Check", desc: "Score any client or payment info for risk before you commit a week.", href: "/dashboard/scam-check", accent: "from-kawaii-coral to-kawaii-peach" },
  { emoji: "⏱️", title: "Time Tracking", desc: "Track hours with screenshot proof — clients trust you on sight.", href: "/dashboard/time-tracker", accent: "from-kawaii-purple to-kawaii-lavender" },
];

export default function FirstRunTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [showCTA, setShowCTA] = useState(false);

  // Server-side once check: only show if the user hasn't seen it.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let local = false;
        try { local = localStorage.getItem(TOUR_KEY) === "1"; } catch {}
        if (local) return;

        const res = await fetch("/api/user-settings");
        if (!res.ok) return;
        const data = await res.json();
        if (data.settings?.onboarding_tour_done === true) return;

        if (active) setTimeout(() => setOpen(true), 900);
      } catch {
        if (active) setTimeout(() => setOpen(true), 1500);
      }
    })();
    return () => { active = false; };
  }, []);

  const markDone = () => {
    try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
    fetch("/api/user-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_tour_done: true }),
    }).catch(() => {});
  };

  const finish = () => { setOpen(false); markDone(); };

  // Final CTA screen (after last feature step).
  const showClosing = showCTA || idx >= STEPS.length;
  const step = STEPS[idx];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
      <button aria-label="Skip tour" onClick={finish} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-dark-card border border-kawaii-lavender/40 dark:border-dark-surface shadow-2xl overflow-hidden animate-slide-up">
        {/* Progress header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {showClosing ? "One last thing" : `${idx + 1} / ${STEPS.length}`}
          </span>
          <button onClick={finish} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1 -m-1" aria-label="Close">✕</button>
        </div>

        {!showClosing ? (
          <>
            {/* Feature step */}
            <div key={idx} className="p-5 animate-fade-in">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.accent} flex items-center justify-center text-2xl mb-3 shadow-sari-sm`}>
                {step.emoji}
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{step.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{step.desc}</p>

              {/* Mini visual mock */}
              {step.mock && (
                <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-dark-surface/40 border border-kawaii-lavender/20 dark:border-dark-surface p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">{step.mock.tag}</p>
                  <div className="space-y-1.5">
                    {step.mock.lines.map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${step.accent}`} />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step.pill && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/60 text-xs font-bold text-kawaii-purple dark:text-kawaii-lavender">
                  ⚡ {step.pill}
                </div>
              )}
            </div>

            {/* Nav */}
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <button key={i} onClick={() => { setIdx(i); setShowCTA(false); }} aria-label={`Step ${i + 1}`} className={`w-2.5 h-2.5 rounded-full transition-all ${i === idx ? "bg-kawaii-purple scale-125" : "bg-kawaii-lavender/30"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                {idx > 0 && (
                  <button onClick={() => setIdx(idx - 1)} className="h-11 px-4 rounded-xl text-slate-500 hover:bg-kawaii-lavender/10 font-bold">←</button>
                )}
                {idx < STEPS.length - 1 ? (
                  <button onClick={() => setIdx(idx + 1)} className="h-11 px-5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy">Next →</button>
                ) : (
                  <button onClick={() => setShowCTA(true)} className="h-11 px-5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold animate-glow-pulse squishy">See more ✨</button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Closing CTA */
          <div className="p-6 animate-slide-up">
            <div className="text-center">
              <p className="text-4xl mb-2 inline-block animate-vibrate">👑</p>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Ready to take this seriously?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                The free plan gets you started. <b>Bloom</b> or <b>Money Club</b> make you unmissable.
              </p>
            </div>

            {/* Quick feature highlights */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {MOCKS.map((m) => (
                <Link key={m.title} href={m.href} onClick={finish} className="rounded-2xl bg-slate-50 dark:bg-dark-surface/40 border border-kawaii-lavender/20 dark:border-dark-surface p-3 text-center hover:border-kawaii-purple/50 transition-colors">
                  <div className={`w-8 h-8 mx-auto rounded-lg bg-gradient-to-br ${m.accent} flex items-center justify-center text-base mb-1.5`}>{m.emoji}</div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{m.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
                </Link>
              ))}
            </div>

            <div className="mt-5 space-y-2.5">
              <Link href="/pricing" onClick={finish} className="block w-full h-12 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold flex items-center justify-center hover:opacity-90 transition-opacity squishy">
                👑 Go unlimited — Money Club
              </Link>
              <button onClick={finish} className="block w-full h-11 rounded-2xl border-2 border-kawaii-lavender/30 dark:border-dark-surface text-slate-500 dark:text-slate-400 font-bold hover:border-kawaii-purple/50 transition-colors">
                Continue with free (for now)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
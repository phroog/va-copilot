"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

/* First-run guided tour — walks the user through the REAL workspace pages.
   Each step opens an actual feature page and shows a coachmark bubble that
   explains it. The final step reveals the 3 plan cards (Sprout / Bloom /
   Money Club) with a cool staggered entrance.
   Appears EXACTLY ONCE per user (server-side flag on user_settings). */

const TOUR_KEY = "sari_first_run_tour_done";

interface TourStep {
  emoji: string;
  href: string;
  title: string;
  desc: string;
}

const STEPS: TourStep[] = [
  { emoji: "📡", href: "/dashboard/live-feed", title: "Your live job feed", desc: "Matching jobs from 10+ platforms stream in here. The best ones land automatically — no tab-hopping." },
  { emoji: "🚀", href: "/dashboard/demo-pitch", title: "AI pitches & swaps", desc: "Here's a real generated pitch for a real-looking job. This is what you get on every match — one click." },
  { emoji: "🛡️", href: "/dashboard/scam-check", title: "Scam check", desc: "Paste a client, URL or payment info — Sari scores the risk in seconds and flags the scammers." },
  { emoji: "⏱️", href: "/dashboard/time-tracker", title: "Track & prove your work", desc: "Start a timer while you work. Clients see tracked hours + screenshots — trust on autopilot." },
  { emoji: "⚙️", href: "/dashboard/setup", title: "Alerts that never sleep", desc: "Connect Telegram or email to get high-match jobs pushed the second they appear." },
];

const PLANS = [
  {
    emoji: "🌱", name: "Sari Sprout", price: "$0", per: "", planKey: "free", desc: "For trying things out",
    features: ["20 matching jobs / day", "5 AI credits / month", "Match & scam score", "CV & PDF"],
    accent: "from-kawaii-mint to-kawaii-lavender", highlight: false,
  },
  {
    emoji: "🌸", name: "Sari Bloom", price: "$4.99", per: "/mo", planKey: "basic", desc: "For active job hunting",
    features: ["100 matching jobs / day", "50 AI credits / month", "Telegram live jobs", "10 swaps / day"],
    accent: "from-kawaii-lavender to-kawaii-pink", highlight: false,
  },
  {
    emoji: "👑", name: "Sari Money Club", price: "$9.99", per: "/mo", planKey: "pro", desc: "For pro freelancers",
    features: ["Unlimited matching jobs", "200 AI credits / month", "Full Telegram bot", "Unlimited swaps"],
    accent: "from-kawaii-purple to-kawaii-pink", highlight: true,
  },
];

export default function FirstRunTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "intro" | "walk" | "plans" | "done">("idle");
  const [idx, setIdx] = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  // Server-side once check.
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
        if (active) setTimeout(() => { setOpen(true); setPhase("intro"); }, 900);
      } catch {
        if (active) setTimeout(() => { setOpen(true); setPhase("intro"); }, 1500);
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

  const finish = () => { setOpen(false); setPhase("done"); markDone(); };

  // When in walk phase and we land on the current step's page, show its bubble.
  useEffect(() => {
    if (!open || phase !== "walk") return;
    if (pathname === STEPS[idx].href) {
      const t = setTimeout(() => setShowBubble(true), 500);
      return () => clearTimeout(t);
    }
    setShowBubble(false);
  }, [pathname, phase, idx, open]);

  const next = () => {
    setShowBubble(false);
    if (idx < STEPS.length - 1) {
      const nxt = STEPS[idx + 1];
      setIdx(idx + 1);
      router.push(nxt.href);
    } else {
      setPhase("plans");
    }
  };

  const startWalk = () => {
    setPhase("walk");
    router.push(STEPS[0].href);
  };

  // Direct checkout: Sprout → dashboard, Bloom/Money Club → Stripe session.
  const choosePlan = async (planKey: string) => {
    if (planKey === "free") {
      finish();
      router.push("/dashboard");
      return;
    }
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) {
        finish();
        window.location.href = data.url;
      } else {
        finish();
        router.push("/pricing");
      }
    } catch {
      finish();
      router.push("/pricing");
    }
  };

  if (!open) return null;

  const step = STEPS[idx];

  return (
    <>
      {/* ── Intro bubble ────────────────────────────────────────── */}
      {phase === "intro" && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center sm:justify-end p-3 sm:p-8">
          <button aria-label="Skip" onClick={finish} className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
          <div className="relative w-full sm:w-80 rounded-3xl bg-white dark:bg-dark-card border border-kawaii-lavender/40 dark:border-dark-surface shadow-2xl p-5 animate-slide-up">
            <p className="text-3xl mb-2">🗺️</p>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Quick tour of your workspace</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              I'll open the real pages and show you what each one does. Takes ~30 seconds.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={finish} className="h-11 px-4 rounded-xl text-slate-400 hover:bg-kawaii-lavender/10 font-bold">Skip</button>
              <button onClick={startWalk} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy">Let's go 🚀</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Walk-through coachmark on each real page ────────────── */}
      {phase === "walk" && showBubble && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:bottom-8 sm:w-80 z-[90]">
          <div className="rounded-3xl bg-white dark:bg-dark-card border border-kawaii-lavender/40 dark:border-dark-surface shadow-2xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{idx + 1} / {STEPS.length}</span>
              <button onClick={finish} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1 -m-1" aria-label="Close">✕</button>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-xl shrink-0`}>
                {step.emoji}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{step.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{step.desc}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-kawaii-purple scale-125" : "bg-kawaii-lavender/30"}`} />
                ))}
              </div>
              <button onClick={next} className="h-11 px-5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy">
                {idx < STEPS.length - 1 ? "Next →" : "See plans ✨"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Final: the 3 plan cards ─────────────────────────────── */}
      {phase === "plans" && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <button aria-label="Close" onClick={finish} className="fixed inset-0 bg-black/50 backdrop-blur-md" />
          <div className="relative w-full max-w-3xl animate-pop-in">
            <div className="text-center mb-6">
              <p className="text-4xl mb-1 inline-block animate-vibrate">👑</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow">Choose how seriously you want to play</h3>
              <p className="text-white/80 text-sm mt-1">Every plan includes the workspace. More power = more jobs, more AI, more edge.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {PLANS.map((p, i) => (
                <div
                  key={p.name}
                  className={`relative rounded-3xl bg-white dark:bg-dark-card p-5 text-center shadow-2xl animate-slide-up ${p.highlight ? "border-2 border-kawaii-purple dark:border-kawaii-lavender scale-[1.02] sm:-mt-2 sm:mb-2" : "border border-kawaii-lavender/30 dark:border-dark-surface"}`}
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold px-3 py-1 rounded-full bg-kawaii-purple text-white whitespace-nowrap">
                      ⭐ MOST POPULAR
                    </span>
                  )}
                  <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center text-xl mb-2`}>{p.emoji}</div>
                  <p className="font-bold text-sm text-slate-500 dark:text-slate-400">{p.name}</p>
                  <p className="mt-1 text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                    {p.price}<span className="text-sm font-medium text-slate-400">{p.per}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                  <ul className="mt-3 space-y-1 text-left text-xs text-slate-600 dark:text-slate-300">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5"><span className="text-kawaii-purple dark:text-kawaii-lavender">✓</span>{f}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => choosePlan(p.planKey)}
                    className={`mt-4 block w-full h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm squishy ${
                      p.highlight
                        ? "bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white animate-glow-pulse"
                        : "bg-white text-kawaii-purple border border-kawaii-purple/40 hover:bg-kawaii-lavender/20 dark:bg-dark-surface"
                    }`}
                  >
                    {p.highlight ? "Go unlimited" : p.price === "$0" ? "Start free" : "Choose"}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border-2 border-kawaii-mint/50 dark:border-green-700/50 bg-green-50/70 dark:bg-green-900/10 px-4 py-3 flex items-center gap-2">
              <span className="text-lg shrink-0">🛡️</span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <b>Billed monthly until you cancel.</b> Cancel anytime with one click — then your plan
                simply runs out at the end of the paid period. No hidden charges.
              </p>
            </div>

            <div className="text-center mt-4">
              <button onClick={finish} className="text-white/70 hover:text-white text-sm font-semibold underline underline-offset-2">
                Not now — let me look around first
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
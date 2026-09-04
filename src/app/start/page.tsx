"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ⚡ Sari Start — the cinematic, funny onboarding.
   No separate login window: email+password, your profile, and a feature tour
   all happen here, step by step, with a few laughs and side facts along the way. */

const SIDE_FACTS = [
  "⚡ You're up to 60% faster with Sari — that's 60% more time for naps.",
  "🕐 Sari checks 1,000 jobs while you blink. Literally.",
  "🤖 The AI writes pitches. You take the credit. It doesn't mind.",
  "🛡️ Scam clients get flagged before they waste your Tuesday.",
  "⏱️ Tracked hours + screenshots = clients who trust you on sight.",
  "💸 Invoices that chase themselves. Your inner introvert approves.",
  "🐌 Slow freelancers read this slower. You're already ahead.",
  "🎯 Only 75%+ matches get in. Your feed is a VIP list.",
];

const FUNNY_TITLES = ["Alright, let's do this.", "You're basically rich already.", "Big brain energy detected.", "This is the easy part.", "Almost a freelancing legend.", "No turning back now."];

const GOALS = [
  { emoji: "🤑", label: "Earn money ASAP", hint: "Client #1, I'm coming for you" },
  { emoji: "🤝", label: "Grow a client base", hint: "Repeat work > one-hit wonders" },
  { emoji: "🧠", label: "Level up my skills", hint: "Become the VA everyone wants" },
  { emoji: "🌴", label: "Work less, earn more", hint: "The dream, honestly" },
];

const FEATURES = [
  { emoji: "📡", title: "Your jobs find you", desc: "Matching jobs from 10+ platforms land in one live feed. No tab-hopping, no refresh marathons.", accent: "from-kawaii-purple to-kawaii-pink" },
  { emoji: "🚀", title: "Pitches that win", desc: "AI writes a tailored pitch per job. You sound brilliant. It's our little secret.", accent: "from-kawaii-pink to-kawaii-coral" },
  { emoji: "🛡️", title: "Scam-proof", desc: "Fake clients get flagged before they waste your week. Your time is precious.", accent: "from-kawaii-coral to-kawaii-peach" },
  { emoji: "⏱️", title: "Track & prove it", desc: "Hours + screenshots + a client portal. Trust on autopilot.", accent: "from-kawaii-purple to-kawaii-lavender" },
  { emoji: "👑", title: "A profile you brag about", desc: "Ratings, hours, verified work — a link you send with pride.", accent: "from-kawaii-pink to-kawaii-purple" },
];

export default function StartPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0); // 0 email, 1 profile, 2 goals, 3 tour, 4 done
  const [loading, setLoading] = useState(true);

  // Step 0 — account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Step 1 — skills
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  // Step 2 — goal
  const [goal, setGoal] = useState<string>("");

  // Step 3 — tour
  const [tourIdx, setTourIdx] = useState(0);

  const factIdx = useRef(Math.floor(Math.random() * SIDE_FACTS.length));
  const titleIdx = useRef(Math.floor(Math.random() * FUNNY_TITLES.length));

  // Already logged in? Skip the email step.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setStep(1);
      setLoading(false);
    });
  }, [supabase]);

  const PRESET_SKILLS = [
    "Email Management", "Data Entry", "Calendar & Scheduling", "Social Media",
    "Customer Support", "Video Editing", "Bookkeeping", "Web Research",
    "Content Writing", "Admin Support", "Transcription", "Graphic Design",
  ];

  const toggleSkill = (s: string) => {
    setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) {
      setAuthError("Email + at least 6-character password, please.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }
    // Account created (email may still need verification in prod) — move on.
    setStep(1);
    setAuthLoading(false);
  };

  const saveProfile = async () => {
    if (skills.length === 0) return;
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, job_vector: [3, 1, 3, 3, 3] }),
      });
    } catch {}
    setStep(2);
  };

  const finish = async () => {
    // Make sure profile is saved even if they skipped skills.
    if (skills.length > 0) {
      try {
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills, job_vector: [3, 1, 3, 3, 3] }),
        });
      } catch {}
    }
    router.push("/dashboard");
  };

  const fact = SIDE_FACTS[factIdx.current % SIDE_FACTS.length];
  const progress = ((step + 1) / 5) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Warming up the magic…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FFF0F5] dark:bg-dark-bg overflow-hidden flex items-center justify-center p-4">
      <div className="blob w-96 h-96 bg-kawaii-pink top-[-10%] left-[-10%]" />
      <div className="blob w-80 h-80 bg-kawaii-purple bottom-[-15%] right-[-10%] animate-blob" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface overflow-hidden mb-8">
          <div className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>

        <div key={step} className="animate-slide-up">
          {/* ── STEP 0: Account ─────────────────────────────────── */}
          {step === 0 && (
            <div className="text-center">
              <p className="text-4xl mb-3">🍠</p>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                Let's make you a freelancing legend.
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Create your account — 30 seconds, no credit card, no judgement.
              </p>

              <form onSubmit={createAccount} className="mt-8 space-y-4 text-left">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full h-12 px-4 rounded-2xl border-2 border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200 focus:border-kawaii-purple focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="mt-1 w-full h-12 px-4 rounded-2xl border-2 border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200 focus:border-kawaii-purple focus:outline-none"
                  />
                </div>
                {authError && <p className="text-sm text-red-500">{authError}</p>}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-base hover:opacity-90 transition-opacity disabled:opacity-60 squishy"
                >
                  {authLoading ? "Creating…" : "🚀 Start earning now"}
                </button>
                <p className="text-center text-xs text-slate-400">
                  Already have an account?{" "}
                  <a href="/auth/login?returnUrl=/start" className="text-kawaii-purple underline">Log in</a>
                </p>
              </form>

              {/* Side fact */}
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {fact}
              </div>
            </div>
          )}

          {/* ── STEP 1: Skills ───────────────────────────────────── */}
          {step === 1 && (
            <div className="text-center">
              <p className="text-4xl mb-3">💪</p>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                What are you great at?
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Pick a few — Sari uses them to find your perfect jobs.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {PRESET_SKILLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSkill(s)}
                    className={`px-3 py-2 rounded-full text-sm font-bold transition-all squishy ${
                      skills.includes(s)
                        ? "bg-kawaii-purple text-white shadow-sm"
                        : "bg-white/80 dark:bg-dark-card border-2 border-kawaii-lavender/30 dark:border-dark-surface text-slate-600 dark:text-slate-300 hover:border-kawaii-purple/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 max-w-xs mx-auto">
                <input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (customSkill.trim()) toggleSkill(customSkill.trim()); setCustomSkill(""); } }}
                  placeholder="+ Add your own…"
                  className="flex-1 h-10 px-4 rounded-xl border-2 border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-kawaii-purple"
                />
                <button onClick={() => { if (customSkill.trim()) { toggleSkill(customSkill.trim()); setCustomSkill(""); } }} className="h-10 px-4 rounded-xl bg-kawaii-purple text-white text-sm font-bold squishy">Add</button>
              </div>

              <div className="mt-8 flex gap-2 justify-center">
                <button onClick={() => setStep(0)} className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold">← Back</button>
                <button
                  onClick={saveProfile}
                  disabled={skills.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold disabled:opacity-50 squishy"
                >
                  {skills.length === 0 ? "Pick at least one" : "Great, next →"}
                </button>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {SIDE_FACTS[(factIdx.current + 1) % SIDE_FACTS.length]}
              </div>
            </div>
          )}

          {/* ── STEP 2: Goal ────────────────────────────────────── */}
          {step === 2 && (
            <div className="text-center">
              <p className="text-4xl mb-3">🎯</p>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                {FUNNY_TITLES[titleIdx.current % FUNNY_TITLES.length]}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                What's the plan, chief?
              </p>

              <div className="mt-6 space-y-3">
                {GOALS.map((g) => (
                  <button
                    key={g.label}
                    onClick={() => setGoal(g.label)}
                    className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition-all squishy ${
                      goal === g.label
                        ? "border-kawaii-purple bg-kawaii-purple/10 dark:bg-kawaii-purple/20"
                        : "border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-surface/30 hover:border-kawaii-purple/50"
                    }`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span>
                      <span className="block font-bold text-slate-700 dark:text-slate-200">{g.label}</span>
                      <span className="block text-xs text-slate-400">{g.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex gap-2 justify-center">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold">← Back</button>
                <button onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy">
                  Pick & continue →
                </button>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {SIDE_FACTS[(factIdx.current + 2) % SIDE_FACTS.length]}
              </div>
            </div>
          )}

          {/* ── STEP 3: Feature tour ────────────────────────────── */}
          {step === 3 && (
            <div className="text-center">
              <div className="mb-4 flex items-center justify-between">
                <button onClick={() => setStep(2)} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">← Back</button>
                <span className="text-xs font-bold text-slate-400">{tourIdx + 1} / {FEATURES.length}</span>
              </div>

              <div key={tourIdx} className="animate-slide-up">
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${FEATURES[tourIdx].accent} flex items-center justify-center text-3xl mb-4`}>
                  {FEATURES[tourIdx].emoji}
                </div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{FEATURES[tourIdx].title}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-sm mx-auto">{FEATURES[tourIdx].desc}</p>
              </div>

              <div className="mt-8 flex gap-2 justify-center">
                {tourIdx > 0 && (
                  <button onClick={() => setTourIdx((i) => i - 1)} className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold">←</button>
                )}
                {tourIdx < FEATURES.length - 1 ? (
                  <button onClick={() => setTourIdx((i) => i + 1)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy">
                    Next →
                  </button>
                ) : (
                  <button onClick={finish} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold animate-glow-pulse squishy">
                    🍠 Take me in
                  </button>
                )}
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {SIDE_FACTS[(factIdx.current + 3) % SIDE_FACTS.length]}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/components/meta-pixel";

/* ⚡ Sari Start — the cinematic, funny onboarding.
   Skills → Goal → Feature-tour (slider) → then create your account, right
   before the workspace. The real feature tour continues inside the dashboard. */

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
  const [step, setStep] = useState(0); // 0 skills, 1 goal, 2 tour slider, 3 account, 4 done
  const [loading, setLoading] = useState(true);

  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [goal, setGoal] = useState<string>("");
  const [tourIdx, setTourIdx] = useState(0);
  const [jobVector, setJobVector] = useState<number[]>([3, 3, 3, 3, 3]);

  const VECTOR_AXES = [
    { label: "Experience", opts: ["Beginner", "Basic", "Experienced", "Advanced", "Expert"] },
    { label: "Technical", opts: ["Pure Admin/VA", "Office/Support", "Social/Content", "Tools (Excel/WP/Video)", "Dev/Data"] },
    { label: "Client contact", opts: ["Backoffice", "Email/Inbox", "Admin/Chat", "Support", "Phone/Sales"] },
    { label: "Workload", opts: ["One-off gig", "Few hours", "Part-time", "~30 hrs", "Full-time"] },
    { label: "Rate tier", opts: ["Low", "Budget", "Mid", "Upper-mid", "Premium"] },
  ];

  // Account (created at the end, before entering the workspace)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const factIdx = useRef(Math.floor(Math.random() * SIDE_FACTS.length));
  const titleIdx = useRef(Math.floor(Math.random() * FUNNY_TITLES.length));

  // Already logged in? Jump past account creation (to done).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setStep(4);
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }
    // Save profile data collected during the tour.
    if (skills.length > 0) {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, job_vector: jobVector }),
      }).catch(() => {});
    }
    // Fire-and-forget welcome email + Meta CompleteRegistration conversion.
    fetch("/api/emails/welcome", { method: "POST" }).catch(() => {});
    trackEvent("CompleteRegistration", { content_name: "signup", status: "true" });
    setAuthLoading(false);
    setStep(4);
  };

  const finish = async () => {
    router.push("/dashboard");
  };

  const fact = (offset = 0) => SIDE_FACTS[(factIdx.current + offset) % SIDE_FACTS.length];
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
          {/* ── STEP 0: Skills ───────────────────────────────────── */}
          {step === 0 && (
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

              {/* Job profile (feeds matching) — compact 5-axis */}
              <div className="mt-5 rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/60 dark:bg-dark-surface/30 p-4">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">📊 Your job profile</p>
                <p className="text-[11px] text-slate-400 -mt-1 mb-3">Tells Sari exactly which jobs fit you.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VECTOR_AXES.map((ax, i) => (
                    <div key={ax.label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{ax.label}</span>
                      <select
                        value={jobVector[i] ?? 3}
                        onChange={(e) => { const arr = [...jobVector]; arr[i] = parseInt(e.target.value, 10); setJobVector(arr); }}
                        className="flex-1 min-w-0 h-9 px-2 rounded-lg border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        {ax.opts.map((o, n) => <option key={n} value={n + 1}>{n + 1} · {o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setStep(1)}
                  disabled={skills.length === 0}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold disabled:opacity-50 squishy"
                >
                  {skills.length === 0 ? "Pick at least one" : "Great, next →"}
                </button>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {fact(0)}
              </div>
            </div>
          )}

          {/* ── STEP 1: Goal ────────────────────────────────────── */}
          {step === 1 && (
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
                <button onClick={() => setStep(0)} className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold">← Back</button>
                <button onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy">
                  Continue →
                </button>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {fact(1)}
              </div>
            </div>
          )}

          {/* ── STEP 2: Feature tour (slider) ────────────────────── */}
          {step === 2 && (
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick look — what you're getting</p>
              <div className="mb-4 flex items-center justify-between">
                <button onClick={() => setTourIdx(Math.max(0, tourIdx - 1))} disabled={tourIdx === 0} className="w-10 h-10 rounded-full bg-white/80 dark:bg-dark-card border-2 border-kawaii-lavender/30 dark:border-dark-surface text-slate-500 disabled:opacity-30 squishy">←</button>
                <div className="flex gap-1.5">
                  {FEATURES.map((_, i) => (
                    <button key={i} onClick={() => setTourIdx(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === tourIdx ? "bg-kawaii-purple scale-125" : "bg-kawaii-lavender/30"}`} />
                  ))}
                </div>
                <button onClick={() => setTourIdx(Math.min(FEATURES.length - 1, tourIdx + 1))} disabled={tourIdx === FEATURES.length - 1} className="w-10 h-10 rounded-full bg-white/80 dark:bg-dark-card border-2 border-kawaii-lavender/30 dark:border-dark-surface text-slate-500 disabled:opacity-30 squishy">→</button>
              </div>

              <div key={tourIdx} className="animate-slide-up">
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${FEATURES[tourIdx].accent} flex items-center justify-center text-3xl mb-4`}>
                  {FEATURES[tourIdx].emoji}
                </div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{FEATURES[tourIdx].title}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-sm mx-auto">{FEATURES[tourIdx].desc}</p>
              </div>

              <div className="mt-8 flex gap-2 justify-center">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold">← Back</button>
                {tourIdx < FEATURES.length - 1 ? (
                  <button onClick={() => setTourIdx((i) => i + 1)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy">Next →</button>
                ) : (
                  <button onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold animate-glow-pulse squishy">Ready — let's set you up 🚀</button>
                )}
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {fact(2)}
              </div>
            </div>
          )}

          {/* ── STEP 3: Create account (before entering workspace) ── */}
          {step === 3 && (
            <div className="text-center">
              <p className="text-4xl mb-3">🔑</p>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                Almost there — create your account.
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Your workspace is ready. 30 seconds and you're in — no credit card.
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
                  {authLoading ? "Creating…" : "🍠 Create account & enter"}
                </button>
                <p className="text-center text-xs text-slate-400">
                  Already have an account?{" "}
                  <a href="/auth/login?returnUrl=/dashboard" className="text-kawaii-purple underline">Log in</a>
                </p>
              </form>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {fact(3)}
              </div>
            </div>
          )}

          {/* ── STEP 4: Done → dashboard ─────────────────────────── */}
          {step === 4 && (
            <div className="text-center">
              <div className="animate-vibrate inline-block text-6xl">🍠</div>
              <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 mt-4">
                You're in. Let's make money.
              </h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-2">
                Your workspace is ready — we'll walk you through the core features real quick.
              </p>
              <div className="mt-8">
                <button
                  onClick={finish}
                  className="px-10 py-4 text-lg rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold animate-glow-pulse squishy"
                >
                  📡 Open my workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
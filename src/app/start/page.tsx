"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/components/meta-pixel";
import { classifyJobVector } from "@/lib/jobs/profile-vector";

/* ⚡ Sari Start — fast onboarding built around ONE goal: show the user their
   first real matches in under a minute. Account → skills → goal → matches. */

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

interface MatchJob {
  id: string;
  title: string;
  platform: string | null;
  budget: string | null;
  profile_match: number | null;
}

/* Animated count-up for the "wow" numbers (jobs scanned, scams caught). */
function useCountUp(target: number, start: boolean, duration = 1400): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) { setVal(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);
  return val;
}

export default function StartPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0); // 0 account, 1 wow, 2 skills, 3 goal, 4 matches
  const [loading, setLoading] = useState(true);

  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [goal, setGoal] = useState<string>("");
  const [jobVector, setJobVector] = useState<number[]>([3, 3, 3, 3, 3]);

  const [matches, setMatches] = useState<MatchJob[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  const [liveStats, setLiveStats] = useState<any>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);

  const jobsHour = useCountUp(liveStats?.jobs_last_hour ?? 0, step === 1 && !liveLoading);
  const scamsDay = useCountUp(liveStats?.scams_last_24h ?? 0, step === 1 && !liveLoading);
  const totalPool = useCountUp(liveStats?.total_jobs ?? 0, step === 1 && !liveLoading);

  const VECTOR_AXES = [
    { label: "Experience", opts: ["Beginner", "Basic", "Experienced", "Advanced", "Expert"] },
    { label: "Technical", opts: ["Pure Admin/VA", "Office/Support", "Social/Content", "Tools (Excel/WP/Video)", "Dev/Data"] },
    { label: "Client contact", opts: ["Backoffice", "Email/Inbox", "Admin/Chat", "Support", "Phone/Sales"] },
    { label: "Workload", opts: ["One-off gig", "Few hours", "Part-time", "~30 hrs", "Full-time"] },
    { label: "Rate tier", opts: ["Low", "Budget", "Mid", "Upper-mid", "Premium"] },
  ];

  const [email, setEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const factIdx = useRef(Math.floor(Math.random() * SIDE_FACTS.length));
  const titleIdx = useRef(Math.floor(Math.random() * FUNNY_TITLES.length));

  // On return from the magic link (now authenticated), send the welcome email
  // once and skip straight to the questions.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        try {
          if (localStorage.getItem("sari_welcome_fired") !== "1") {
            localStorage.setItem("sari_welcome_fired", "1");
            fetch("/api/emails/welcome", { method: "POST" }).catch(() => {});
          }
        } catch {}
        setStep(2);
      }
      setLoading(false);
    });
  }, [supabase]);

  const PRESET_SKILLS = [
    "Email Management", "Data Entry", "Calendar & Scheduling", "Social Media",
    "Customer Support", "Video Editing", "Bookkeeping", "Web Research",
    "Content Writing", "Admin Support", "Transcription", "Graphic Design",
  ];

  // Rotate the live-feed ticker on the "wow" step.
  useEffect(() => {
    if (step !== 1) return;
    const jobs = liveStats?.recent_jobs ?? [];
    if (jobs.length <= 1) return;
    const iv = setInterval(() => setTickerIdx((i) => (i + 1) % jobs.length), 1800);
    return () => clearInterval(iv);
  }, [step, liveStats]);

  const toggleSkill = (s: string) => {
    setSkills((prev) => {
      const next = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
      // Auto-derive the matching vector from the chosen skills so the first
      // matches are real and relevant — no manual tuning required.
      if (next.length > 0) {
        try {
          const { vector } = classifyJobVector({ title: "", description: next.join(" "), skills: next });
          setJobVector(vector);
        } catch {}
      }
      return next;
    });
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!valid) {
      setAuthError("Please enter a valid email.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    const randomPw = "sari_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { error } = await supabase.auth.signUp({ email, password: randomPw });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    trackEvent("CompleteRegistration", { content_name: "signup", status: "true" });
    fetch("/api/meta/registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    fetch("/api/emails/welcome", { method: "POST" }).catch(() => {});
    // Kick off the "wow" step: load live scan numbers right away.
    setStep(1);
    setLiveLoading(true);
    fetch("/api/live-stats")
      .then((r) => r.json())
      .then((d) => setLiveStats(d))
      .catch(() => setLiveStats(null))
      .finally(() => setLiveLoading(false));
  };

  /* Save the profile and immediately fetch the user's first real matches —
     the "aha" moment. Auto-grants the top matches into My Matches so the
     dashboard is never empty. */
  const goToMatches = async () => {
    if (skills.length > 0) {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, job_vector: jobVector }),
      }).catch(() => {});
    }
    setStep(4);
    setMatchLoading(true);
    try {
      const r = await fetch("/api/jobs/feed?mode=best&limit=3&count_views=1");
      const d = await r.json();
      const top = (d.jobs ?? [])
        .filter((j: any) => (j.profile_match ?? 0) >= 40)
        .slice(0, 3);
      setMatches(top);
    } catch {
      setMatches([]);
    }
    setMatchLoading(false);
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
          {/* ── STEP 1: Wow — live scan numbers ────────────────── */}
          {step === 1 && (
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-kawaii-coral dark:text-kawaii-pink mb-2">🔴 Live right now</p>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                We just scanned the internet<br />
                <span className="text-kawaii-purple dark:text-kawaii-lavender">before everyone else</span>
              </h1>

              {/* Live feed ticker */}
              <div className="mt-6 rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-4 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">🟢 Jobs detected in the last hour</p>
                {liveLoading ? (
                  <p className="text-sm text-slate-400 animate-pulse">Scanning 10+ platforms…</p>
                ) : (liveStats?.recent_jobs ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">Warming up the feed…</p>
                ) : (
                  <div className="min-h-[56px]">
                    {(liveStats.recent_jobs ?? []).map((j: any, i: number) => (
                      <div key={j.id} className={`flex items-center justify-between gap-2 py-1 transition-opacity duration-500 ${i === tickerIdx ? "opacity-100" : "opacity-20"}`}>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{j.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{j.platform}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Big numbers */}
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-gradient-to-br from-kawaii-purple/10 to-kawaii-pink/10 p-3">
                  <p className="text-2xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender tabular-nums">{jobsHour}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-tight">jobs / hour</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-kawaii-coral/10 to-kawaii-pink/10 p-3">
                  <p className="text-2xl font-extrabold text-kawaii-coral dark:text-kawaii-pink tabular-nums">{scamsDay}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-tight">scams flagged today</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-kawaii-mint/10 to-kawaii-purple/10 p-3">
                  <p className="text-2xl font-extrabold text-slate-700 dark:text-slate-100 tabular-nums">{totalPool}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-tight">jobs in our pool</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                These are real jobs Sari scanned in the <b>last hour</b> — and real scams we flagged{" "}
                <b>before they wasted your week</b>.
              </p>

              <div className="mt-6">
                <button onClick={() => setStep(2)} className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-base animate-glow-pulse squishy">
                  🎯 Find MY jobs →
                </button>
              </div>
              <div className="mt-3">
                <button onClick={() => router.push("/pricing")} className="text-xs text-slate-400 underline hover:text-slate-600">
                  Or unlock everything now — from $4.99
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Skills ───────────────────────────────────── */}
          {step === 2 && (
            <div className="text-center">
              <p className="text-4xl mb-3">💪</p>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                What are you great at?
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Pick a few — we'll find matching jobs for you right after.
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
                  onClick={() => setStep(3)}
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

          {/* ── STEP 3: Goal ────────────────────────────────────── */}
          {step === 3 && (
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
                <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold">← Back</button>
                <button onClick={goToMatches} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy">
                  🎯 Find my first jobs →
                </button>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {fact(1)}
              </div>
            </div>
          )}

          {/* ── STEP 4: First matches (the aha moment) ───────────── */}
          {step === 4 && (
            <div className="text-center">
              {matchLoading ? (
                <>
                  <p className="text-4xl mb-3">🔍</p>
                  <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Finding jobs that fit you…</h1>
                  <div className="mt-6 space-y-2 text-sm text-slate-500 dark:text-slate-400 min-h-[60px]">
                    <p className="animate-fade-in">📊 Scanning your skills…</p>
                    <p className="animate-fade-in">👥 Matching you against 1,000+ live jobs…</p>
                    <p className="animate-fade-in">🎯 Picking your best fits…</p>
                  </div>
                  <div className="mt-6 h-2 w-full max-w-xs mx-auto rounded-full bg-kawaii-lavender/20 overflow-hidden">
                    <div className="h-full w-1/2 bg-gradient-to-r from-kawaii-purple to-kawaii-pink rounded-full animate-pulse" />
                  </div>
                </>
              ) : matches.length > 0 ? (
                <>
                  <p className="text-4xl mb-3">🎉</p>
                  <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                    {matches.length} job{matches.length === 1 ? "" : "s"} that fit <span className="text-kawaii-purple dark:text-kawaii-lavender">you</span>
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Real openings, matched to your skills. This is what you'd otherwise scroll 2 hours to find.
                  </p>

                  <div className="mt-6 space-y-3">
                    {matches.map((m) => (
                      <div key={m.id} className="text-left rounded-2xl border-2 border-kawaii-purple/30 dark:border-kawaii-lavender/30 bg-white/80 dark:bg-dark-card p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{m.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {m.platform || "Online"}{m.budget ? ` · ${m.budget}` : ""}
                          </p>
                        </div>
                        {m.profile_match != null && (
                          <span className="text-sm font-extrabold text-kawaii-purple dark:text-kawaii-lavender shrink-0">
                            {m.profile_match}% match
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <button onClick={finish} className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-base animate-glow-pulse squishy">
                      See all my matches →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-4xl mb-3">🌱</p>
                  <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    Your workspace is ready
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-3">
                    Add more skills in Settings to unlock sharper matches.
                  </p>
                  <div className="mt-8">
                    <button onClick={finish} className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-base squishy">
                      Open my workspace →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 0: Create account (first) ───────────────────── */}
          {step === 0 && (
            <div className="text-center">
              <p className="text-4xl mb-3">🍠</p>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                Create your account — 30 seconds.
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                No credit card. We'll find matching jobs for you in under a minute.
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
                {authError && <p className="text-sm text-red-500">{authError}</p>}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-base hover:opacity-90 transition-opacity disabled:opacity-60 squishy"
                >
                  {authLoading ? "Creating…" : "🚀 Start free"}
                </button>
                <p className="text-center text-xs text-slate-400">
                  No credit card · No password needed — you're in instantly.
                </p>
              </form>

              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/15 dark:bg-dark-surface/50 text-xs font-semibold text-kawaii-purple dark:text-kawaii-lavender">
                {fact(3)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

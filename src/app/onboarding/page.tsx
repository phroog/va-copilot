"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const VECTOR_AXES = [
  { key: "erfahrung", label: "Experience", opts: ["Beginner", "Basic knowledge", "Experienced (2–4 yrs)", "Advanced", "Expert (5+ yrs)"] },
  { key: "technik", label: "Technical Skills", opts: ["Pure Admin/VA", "Office/Support", "Social Media/Content", "Tools (Excel/WordPress/Video)", "Dev/Data/Engineering"] },
  { key: "kundenkontakt", label: "Client Contact", opts: ["Backoffice/Data", "Email/Inbox", "General Admin/Chat", "Support/Reception", "Phone/Sales"] },
  { key: "auslastung", label: "Workload", opts: ["One-off gig", "Few hours", "Part-time", "~30 hrs", "Full-time"] },
  { key: "budget", label: "Budget", opts: ["< $5/hr · < $200 fixed", "< $15/hr", "< $25/hr", "< $45/hr", "$45+/hr · Premium"] },
];

/* Cinematic onboarding: Welcome → Profile setup → Feature tour → Done.
   Each step animates in; keep it light (no heavy deps). */

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !(values || []).includes(v)) onChange([...(values || []), v]);
    setText("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1">
        {(values || []).map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-slate-700 dark:text-slate-200">
            {v}
            <button type="button" onClick={() => onChange((values || []).filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
      />
    </div>
  );
}

const FEATURES = [
  {
    emoji: "📡",
    title: "Your jobs find you",
    desc: "Matching jobs from 10+ platforms land in one live feed — no more tab-hopping. The best ones arrive automatically every day.",
    accent: "from-kawaii-purple to-kawaii-pink",
  },
  {
    emoji: "🚀",
    title: "Pitches that win",
    desc: "AI writes a tailored pitch for every job. Better applications, faster — before other freelancers even apply.",
    accent: "from-kawaii-pink to-kawaii-coral",
  },
  {
    emoji: "🛡️",
    title: "Scam-proof from day one",
    desc: "Fake clients get flagged before you waste a week. Your time and your safety, protected.",
    accent: "from-kawaii-coral to-kawaii-peach",
  },
  {
    emoji: "⏱️",
    title: "Track & prove your work",
    desc: "Log hours, capture screenshots, and share a live client portal — clients see exactly what you do. Trust built automatically.",
    accent: "from-kawaii-purple to-kawaii-lavender",
  },
  {
    emoji: "📄",
    title: "Get paid, on time",
    desc: "Invoices with a built-in compliance check and automatic earnings tracking. No more chasing payments.",
    accent: "from-kawaii-lavender to-kawaii-pink",
  },
  {
    emoji: "👑",
    title: "A profile you're proud to share",
    desc: "Your public profile shows ratings, hours and verified work — a link you send clients with confidence.",
    accent: "from-kawaii-pink to-kawaii-purple",
  },
];

const GOALS = [
  { emoji: "🤑", label: "Earn money fast", hint: "I want my first clients ASAP" },
  { emoji: "🧠", label: "Grow my skills", hint: "I'm leveling up as a VA" },
  { emoji: "🤝", label: "Build a client base", hint: "Long-term clients & repeat work" },
  { emoji: "🕐", label: "Work smarter", hint: "Less manual work, more income" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 welcome, 1 profile, 2 features, 3 done
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [jobVector, setJobVector] = useState<number[]>([3, 3, 3, 3, 3]);
  const [goal, setGoal] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) { router.replace("/auth/login?returnUrl=/onboarding"); return; }
          setLoading(false);
          return;
        }
        const { profile } = await res.json();
        const hasSkills = Array.isArray(profile?.skills) && profile.skills.length > 0;
        const hasVector = Array.isArray(profile?.job_vector) && profile.job_vector.length === 5;
        if (hasSkills && hasVector) {
          router.replace("/dashboard");
          return;
        }
        if (Array.isArray(profile?.skills)) setSkills(profile.skills);
        if (hasVector) setJobVector(profile.job_vector);
        setLoading(false);
      } catch { setLoading(false); }
    })();
  }, [router]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, job_vector: jobVector }),
      });
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error || "Saving failed"); }
      setStatus({ type: "ok", text: "Profile saved 🎉" });
      setTimeout(() => setStep(2), 500);
    } catch (e: any) {
      setStatus({ type: "err", text: e?.message || "Saving failed" });
    } finally { setSaving(false); }
  };

  const canSave = skills.length >= 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Setting up your workspace…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FFF0F5] dark:bg-dark-bg overflow-hidden flex items-center justify-center p-4">
      <div className="blob w-96 h-96 bg-kawaii-pink top-[-10%] left-[-10%]" />
      <div className="blob w-80 h-80 bg-kawaii-purple bottom-[-15%] right-[-10%] animate-blob" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 w-full max-w-2xl animate-fade-in" key={step}>
        {/* ── STEP 0: Welcome ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="text-center space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/30 dark:bg-dark-surface text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender">
              🍠 Welcome to Sari
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
              Your next client is{" "}
              <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
                one setup away.
              </span>
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Freelancing is a grind. Sari makes it unfair — in your favour. 30 seconds to set up,
              then the jobs find <i>you</i>.
            </p>
            <div className="mt-8">
              <Button size="lg" onClick={() => setStep(1)} className="px-10 py-4 text-lg rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold animate-glow-pulse">
                🚀 Let's go
              </Button>
              <p className="mt-3 text-xs text-slate-400">Free forever plan · No credit card</p>
            </div>
          </div>
        )}

        {/* ── STEP 1: Profile setup ───────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="text-4xl mb-2">🎯</div>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">What do you do best?</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                This is how Sari finds your perfect jobs.
              </p>
            </div>

            {/* Goal */}
            <Card>
              <CardContent className="p-5">
                <Label className="text-sm font-bold mb-2 block">What's your main goal right now?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.label}
                      onClick={() => setGoal(g.label)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all squishy ${
                        goal === g.label
                          ? "border-kawaii-purple bg-kawaii-purple/10 dark:bg-kawaii-purple/20"
                          : "border-kawaii-lavender/30 dark:border-dark-surface bg-white/60 dark:bg-dark-surface/30 hover:border-kawaii-purple/50"
                      }`}
                    >
                      <span className="text-xl block mb-1">{g.emoji}</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{g.label}</span>
                      <span className="block text-[10px] text-slate-400">{g.hint}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-base">💪 Your Skills</Label>
                  <ChipInput values={skills} onChange={setSkills} placeholder="Type a skill + Enter (e.g. Email Management, Data Entry)" />
                  <p className="text-xs text-slate-400">Determines what jobs are matched to you.</p>
                </div>

                <div className="space-y-3 pt-1">
                  <Label className="text-base">📊 Your Job Profile (1–5)</Label>
                  {VECTOR_AXES.map((ax, i) => (
                    <div key={ax.key} className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Label className="text-sm flex-1">{ax.label}</Label>
                        <select
                          value={jobVector[i] ?? 3}
                          onChange={(e) => {
                            const arr = [...jobVector];
                            arr[i] = parseInt(e.target.value, 10);
                            setJobVector(arr);
                          }}
                          className="w-40 h-10 px-2 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n} · {ax.opts[n - 1]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  {status && (
                    <p className={`text-sm text-center ${status.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {status.text}
                    </p>
                  )}
                  <Button onClick={saveProfile} disabled={saving || !canSave} className="w-full">
                    {saving ? "Saving…" : "Show me the magic ✨"}
                  </Button>
                  <Button variant="ghost" onClick={() => setStep(2)}>Skip for now</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STEP 2: Feature tour ────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="text-4xl mb-2">🚀</div>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                Here's what changes for you.
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Six things Sari does so you don't have to.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f, i) => (
                <Card
                  key={f.title}
                  className={`border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 hover:shadow-sari transition-shadow animate-fade-in`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center text-lg mb-3`}>
                      {f.emoji}
                    </div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100">{f.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => setStep(3)} className="w-full">
                I'm ready — take me in 🍠
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Done ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="text-center space-y-6 animate-slide-up">
            <div className="animate-vibrate inline-block text-6xl">🍠</div>
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">
              You're in. Let's make money.
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Your live feed is already waiting. Open your dashboard and see the
              jobs that fit <i>you</i> — matched and ready.
            </p>
            <div className="mt-8">
              <Button size="lg" onClick={() => router.replace("/dashboard")} className="px-10 py-4 text-lg rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold animate-glow-pulse">
                📡 Open my feed
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SUGGESTED } from "@/lib/learn/funnel";
import type { FunnelQ } from "@/lib/learn/funnel";

interface PathOption {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  persona: string;
}

type Step = "hero" | "pick" | "suggest" | "ready" | "play" | "verdict" | "contact" | "plans";

const PLANS = [
  {
    key: "free",
    emoji: "🌱",
    name: "Free",
    tagline: "Try the dream on",
    deposit: "$0",
    benefits: ["1 new chapter a day", "All your tools, unlocked", "Watch the leaderboard"],
    note: "You won't be in the Scout Pool",
    tone: "neutral",
  },
  {
    key: "basic",
    emoji: "🌸",
    name: "BLOOM",
    tagline: "Where dreams start to feel real",
    deposit: "$4.99",
    benefits: ["2 new chapters a day", "The Client Sim grind", "Your badge goes live", "Into the Scout Pool"],
    note: "One deposit a month. No subscription.",
    tone: "bloom",
  },
  {
    key: "pro",
    emoji: "👑",
    name: "Money Club",
    tagline: "The stage. The spotlight. You.",
    deposit: "$9.99",
    benefits: ["Unlimited chapters", "Unlimited Client Sim", "Top Scout Pool — agencies see you first", "✓ Verified badge", "1:1 support"],
    note: "One deposit a month. No subscription.",
    tone: "pro",
  },
];

const FAQS = [
  { q: "How do I actually get hired?", a: "You train by playing. Every sealed skill lands on your badge. Our own agencies review the Scout Pool — and the higher you climb, the harder it is to ignore you." },
  { q: "What if an agency scouts me?", a: "You get hired — and your plan is refunded 100%. That's our money-back scout guarantee, in writing." },
  { q: "Why a \"deposit\" and not a subscription?", a: "Because we hate being locked in as much as you do. One deposit, ~30 days of unlimited training, and it just runs out. Like a SIM card." },
  { q: "Is this really for beginners?", a: "The first mission takes 3 minutes. If you can answer three questions, you're already a VA in training." },
];

export default function DreamPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("hero");
  const [paths, setPaths] = useState<PathOption[]>([]);
  const [path, setPath] = useState<PathOption | null>(null);
  const [questions, setQuestions] = useState<FunnelQ[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [confirmFree, setConfirmFree] = useState(false);
  const [pickedPlan, setPickedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "pick") return;
    fetch("/api/public/paths")
      .then((r) => r.json())
      .then((d) => setPaths(d?.paths ?? []))
      .catch(() => {});
  }, [step]);

  // ?start=1 from the landing CTA skips the hero.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("start") === "1") {
      setStep("pick");
    }
  }, []);

  const choosePath = (p: PathOption) => {
    setPath(p);
    setStep("ready");
  };

  useEffect(() => {
    if (step !== "play" || path) return;
    setStep("pick");
  }, [step, path]);

  useEffect(() => {
    if (step === "play" && path) {
      fetch(`/api/public/funnel/lesson?title=${encodeURIComponent(path.title)}`)
        .then((r) => r.json())
        .then((d) => {
          setQuestions(d?.questions ?? []);
          setQIdx(0);
          setPicked(null);
          setCorrect(0);
        })
        .catch(() => setStep("pick"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, path]);

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[qIdx].correct) setCorrect((c) => c + 1);
  };

  const nextQ = () => {
    if (qIdx + 1 >= questions.length) {
      setStep("verdict");
    } else {
      setQIdx((i) => i + 1);
      setPicked(null);
    }
  };

  const goContact = () => {
    setStep("contact");
  };

  const submitContact = async () => {
    try {
      localStorage.setItem("sari_dream", JSON.stringify({ email, whatsapp, path: path?.title, persona: path?.persona }));
    } catch {}
    // Send the magic link right away so they're signed in the moment they click it.
    if (email.trim()) {
      try {
        const supabase = createClient();
        await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: `${window.location.origin}/pricing` },
        });
      } catch {}
    }
    setStep("plans");
  };

  const choosePlan = (key: string) => {
    if (key === "free") {
      setPickedPlan("free");
      setConfirmFree(true);
      return;
    }
    try {
      localStorage.setItem("sari_dream_plan", key);
    } catch {}
    router.push(`/auth/signup?returnUrl=${key === "pro" ? "/pricing" : "/pricing"}`);
  };

  const confirmFreeContinue = () => {
    setConfirmFree(false);
    router.push("/auth/signup?returnUrl=/learn");
  };

  const persona = path?.persona ?? "future VA";
  const score = questions.length ? correct / questions.length : 0;
  const strong = score >= 0.67;

  return (
    <div className="min-h-screen text-white" style={{ background: "radial-gradient(1200px 800px at 50% -10%, #2a1740 0%, #0a0a1a 60%)" }}>
      <AnimatePresence mode="wait">
        {step === "hero" && (
          <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-extrabold">🎮 PLAY TO GET HIRED</span>
            <h1 className="mt-6 text-5xl sm:text-7xl font-black leading-[1.02]">
              Do you have
              <br />
              <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">what it takes?</span>
            </h1>
            <p className="mt-5 text-white/70 max-w-xl text-lg">
              We own the agencies. You bring the dream. Answer a few questions and find out if you're scouting material.
            </p>
            <button
              onClick={() => setStep("pick")}
              className="mt-9 px-12 py-5 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-black text-xl shadow-2xl shadow-kawaii-purple/40 hover:scale-[1.04] active:scale-[0.97] transition-all squishy"
            >
              Start your dream →
            </button>
            <p className="mt-5 text-xs text-white/40">3 minutes · free · no card needed</p>
          </motion.div>
        )}

        {step === "pick" && (
          <motion.div key="pick" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <h2 className="text-3xl sm:text-4xl font-black text-center max-w-lg">
              What do you want to build your <span className="text-kawaii-pink">wealth</span> from?
            </h2>
            <p className="mt-2 text-white/50 text-sm text-center">Pick a lane. Your future clients are already in it.</p>
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl w-full">
              {paths.map((p) => (
                <button
                  key={p.id}
                  onClick={() => choosePath(p)}
                  className="text-left rounded-3xl bg-white/5 border border-white/15 p-4 hover:border-kawaii-purple hover:bg-white/10 transition-all squishy"
                >
                  <span className="text-3xl">{p.emoji}</span>
                  <p className="mt-2 font-black text-white">{p.persona}</p>
                  <p className="text-xs text-white/50">{p.title}</p>
                </button>
              ))}
              <button
                onClick={() => setStep("suggest")}
                className="text-left rounded-3xl bg-white/5 border border-dashed border-white/25 p-4 hover:border-kawaii-purple hover:bg-white/10 transition-all squishy"
              >
                <span className="text-3xl">🤷</span>
                <p className="mt-2 font-black text-white">Not sure yet</p>
                <p className="text-xs text-white/50">We'll match you to your strengths</p>
              </button>
            </div>
          </motion.div>
        )}

        {step === "suggest" && (
          <motion.div key="suggest" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <h2 className="text-3xl sm:text-4xl font-black text-center max-w-lg">Good choice. Let's find your lane.</h2>
            <p className="mt-2 text-white/50 text-sm text-center">Three paths built around different strengths:</p>
            <div className="mt-8 grid sm:grid-cols-3 gap-3 max-w-3xl w-full">
              {SUGGESTED.map((s) => (
                <button
                  key={s.title}
                  onClick={() => choosePath({ id: s.title, title: s.title, subtitle: s.persona, emoji: s.emoji, persona: s.persona })}
                  className="text-center rounded-3xl bg-white/5 border border-white/15 p-5 hover:border-kawaii-purple hover:bg-white/10 transition-all squishy"
                >
                  <span className="text-4xl">{s.emoji}</span>
                  <p className="mt-2 font-black text-white">{s.persona}</p>
                  <div className="mt-2 flex justify-center gap-1.5">
                    {s.traits.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white/70">{t}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-white/40">{s.title}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "ready" && path && (
          <motion.div key="ready" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="text-7xl">
              {path.emoji}
            </motion.div>
            <h2 className="mt-6 text-4xl sm:text-5xl font-black">{path.persona}</h2>
            <p className="mt-3 text-white/70 text-lg max-w-md">
              See if you're worthy. Three quick questions — no pressure, no nonsense.
            </p>
            <button onClick={() => setStep("play")} className="mt-8 px-10 py-4 rounded-2xl bg-dl-green text-white font-black text-lg shadow-btn-green hover:brightness-105 active:translate-y-1 active:shadow-none transition-all squishy">
              Let's go →
            </button>
          </motion.div>
        )}

        {step === "play" && questions.length > 0 && (
          <motion.div key="play" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-white/40">{path?.persona} · {path?.emoji}</span>
                <span className="text-xs font-bold text-white/40">Question {qIdx + 1}/{questions.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-6">
                <div className="h-full bg-kawaii-purple rounded-full transition-all" style={{ width: `${((qIdx + (picked !== null ? 1 : 0)) / questions.length) * 100}%` }} />
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={qIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <h3 className="text-xl sm:text-2xl font-black leading-snug">{questions[qIdx].prompt}</h3>
                  <div className="mt-5 space-y-2">
                    {questions[qIdx].options.map((opt, i) => {
                      const isPicked = picked === i;
                      const isCorrect = picked !== null && i === questions[qIdx].correct;
                      return (
                        <button
                          key={i}
                          onClick={() => answer(i)}
                          disabled={picked !== null}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-2xl border-2 font-semibold text-sm transition-all squishy",
                            picked === null && "bg-white/5 border-white/15 hover:border-kawaii-purple",
                            isCorrect && "bg-dl-green border-dl-green text-white",
                            isPicked && !isCorrect && "bg-dl-red/30 border-dl-red text-white"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {picked !== null && (
                    <div className="mt-4 rounded-2xl bg-white/5 border border-white/15 p-4">
                      <p className="text-sm text-white/80">{picked === questions[qIdx].correct ? "✅ " : "💡 "}{questions[qIdx].explanation}</p>
                      <button onClick={nextQ} className="mt-3 px-6 py-2.5 rounded-xl bg-dl-green text-white font-extrabold shadow-btn-green hover:brightness-105 transition-all squishy">
                        {qIdx + 1 >= questions.length ? "See my verdict →" : "Next →"}
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {step === "verdict" && (
          <motion.div key="verdict" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="text-7xl">
              {strong ? "🏆" : "🌱"}
            </motion.div>
            <h2 className="mt-6 text-4xl sm:text-5xl font-black max-w-xl">
              {strong ? "You are disciplined." : "You are worthy."}
            </h2>
            <p className="mt-3 text-white/70 text-lg max-w-md">
              {strong
                ? "Your chances are high. The agencies are looking — and you just proved you can play."
                : "Every master started right where you are. The path is open — let's build you up."}
            </p>
            <p className="mt-3 text-sm text-kawaii-lavender font-bold">{correct}/{questions.length} on point as a {persona}.</p>
            <div className="mt-4 rounded-2xl bg-dl-gold/10 border border-dl-gold/30 px-4 py-2.5">
              <p className="text-sm font-extrabold text-dl-gold">🎓 Your live certificate is being minted.</p>
              <p className="text-[11px] text-white/60 mt-0.5">Seal skills → your badge grows. That certificate is what agencies read.</p>
            </div>
            <button onClick={goContact} className="mt-6 px-10 py-4 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-black text-lg shadow-2xl shadow-kawaii-purple/40 hover:scale-[1.03] transition-all squishy">
              Claim your path →
            </button>
          </motion.div>
        )}

        {step === "contact" && (
          <motion.div key="contact" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
              <span className="text-4xl">📮</span>
              <h2 className="mt-3 text-3xl font-black">So you don't oversleep your hiring 😉</h2>
              <p className="mt-2 text-white/60 text-sm">
                When the agencies are watching, you'll want a heads-up. Drop your details and we'll text you the moment it matters.
              </p>
              <div className="mt-6 space-y-3">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Your email"
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white text-sm font-semibold placeholder:text-white/30 focus:border-kawaii-purple outline-none"
                />
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  type="tel"
                  placeholder="WhatsApp number (+63...)"
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white text-sm font-semibold placeholder:text-white/30 focus:border-kawaii-purple outline-none"
                />
                <button
                  onClick={submitContact}
                  disabled={!email.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-black text-lg shadow-xl shadow-kawaii-purple/30 hover:scale-[1.01] transition-all squishy disabled:opacity-40"
                >
                  I'm in — show me the plans →
                </button>
                <p className="text-center text-[11px] text-white/35">No spam. We only text when your hiring is at stake.</p>
              </div>
            </div>
          </motion.div>
        )}

        {step === "plans" && (
          <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-14 px-4">
            <div className="text-center mb-8">
              <h2 className="text-4xl sm:text-5xl font-black">Are you ready to become the person you want to be?</h2>
              <p className="mt-3 text-white/60 max-w-xl mx-auto">
                One deposit a month. No subscriptions. The more you give, the louder the agencies hear you.
              </p>
            </div>

            {/* swipeable plans */}
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 max-w-5xl mx-auto" style={{ scrollbarWidth: "none" }}>
              {PLANS.map((p) => (
                <div
                  key={p.key}
                  className={cn(
                    "snap-center shrink-0 w-[290px] rounded-[28px] p-6 flex flex-col relative overflow-hidden",
                    p.tone === "pro" && "bg-black border border-white/20 shadow-[0_0_80px_rgba(255,200,0,0.18)]",
                    p.tone === "bloom" && "bg-[#1c1833] border border-kawaii-purple/50",
                    p.tone === "neutral" && "bg-[#101020] border border-white/10"
                  )}
                >
                  {p.tone === "pro" && (
                    <>
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-kawaii-pink/30 to-transparent blur-2xl pointer-events-none" />
                      <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-white text-black text-[10px] font-black">SPOTLIGHT</span>
                    </>
                  )}
                  <span className="text-4xl">{p.emoji}</span>
                  <p className="mt-2 text-2xl font-black">{p.name}</p>
                  <p className="text-sm text-white/60">{p.tagline}</p>
                  <p className="mt-4 text-4xl font-black">
                    {p.deposit}
                    <span className="text-sm font-bold text-white/40"> / month</span>
                  </p>
                  <ul className="mt-4 space-y-2 flex-1 text-sm">
                    {p.benefits.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-white/85">
                        <span className={p.tone === "pro" ? "text-kawaii-pink" : "text-kawaii-purple"}>✦</span>{b}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-white/45">{p.note}</p>
                  <button
                    onClick={() => choosePlan(p.key)}
                    className={cn(
                      "mt-4 py-3.5 rounded-2xl font-black text-base transition-all squishy",
                      p.tone === "pro" ? "bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white shadow-xl shadow-kawaii-purple/30" : "bg-white text-black hover:bg-kawaii-lavender"
                    )}
                  >
                    {p.key === "free" ? "Start free" : `Deposit ${p.deposit}`}
                  </button>
                </div>
              ))}
            </div>

            {/* magic link + gcash + certificate */}
            <div className="max-w-3xl mx-auto mt-8 space-y-3 px-4">
              {email.trim() && (
                <div className="rounded-2xl bg-white/5 border border-kawaii-purple/40 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-white/80">📩 Magic link sent to <b className="text-kawaii-lavender">{email.trim()}</b></p>
                  <p className="text-[11px] text-white/45 mt-0.5">Click it when it lands and you're in — we'll bring you straight here.</p>
                </div>
              )}
              <div className="rounded-2xl bg-dl-gold/10 border border-dl-gold/30 px-4 py-3 text-center">
                <p className="text-sm font-extrabold text-dl-gold">🎓 Your live certificate = your badge</p>
                <p className="text-[11px] text-white/60 mt-0.5">Every sealed skill grows it. That's the certificate agencies actually read.</p>
              </div>
              <p className="text-center text-[12px] text-white/45">
                🇵🇭 From the Philippines? Pay with <b className="text-white/70">GCash</b> or <b className="text-white/70">Maya</b> via <b className="text-white/70">Google Pay</b> or <b className="text-white/70">PayPal</b> at checkout.
              </p>
            </div>

            {/* FAQ */}
            <div className="max-w-xl mx-auto mt-10 space-y-2 px-4">
              <p className="text-center text-sm font-black text-white/70 mb-3">Good questions</p>
              {FAQS.map((f) => (
                <details key={f.q} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 group">
                  <summary className="cursor-pointer text-sm font-extrabold text-white list-none">{f.q}</summary>
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* free-confirm popup */}
      <AnimatePresence>
        {confirmFree && (
          <>
            <motion.div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmFree(false)} />
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 pointer-events-none">
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="pointer-events-auto w-full max-w-sm rounded-3xl bg-[#1f2233] border border-white/10 p-6 text-center"
              >
                <div className="text-5xl">🤔</div>
                <h3 className="mt-3 text-xl font-black text-white">Are you sure?</h3>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">
                  On Free, you'll <b className="text-white">never be found</b> — you don't even land in the Scout Pool.
                  The agencies that want you? They'll never see you. Is that really the dream?
                </p>
                <div className="mt-5 space-y-2">
                  <button onClick={() => setConfirmFree(false)} className="w-full py-3 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-black">
                    Wait — I want to be found →
                  </button>
                  <button onClick={confirmFreeContinue} className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/15 text-white/70 font-bold hover:bg-white/10 transition-all">
                    Free is fine for now
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="fixed top-4 left-4 z-10">
        <Link href="/" className="text-2xl">🍠</Link>
      </div>
    </div>
  );
}
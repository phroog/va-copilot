"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PathWithNodes } from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import { answerJuice, finishJuice, levelUpJuice } from "@/lib/juice";
import { RollingNumber } from "@/components/learn/rolling-number";
import { RankHud, type HudUser } from "@/components/learn/rank-hud";
import {
  generateRound,
  HAPPY_EMOJIS,
  MAX_HAPPY,
  START_HAPPY,
  ROUND_SECONDS,
  streakMultiplier,
  xpForRound,
  type SimRound,
} from "@/lib/learn/client-sim";

interface ChatMsg {
  id: number;
  role: "client" | "you" | "system";
  text: string;
  ok?: boolean;
  trap?: boolean;
}

interface SessionSummary {
  xp_earned: number;
  rounds: number;
  correct: number;
  bestStreak: number;
  rankUp: { from: string; to: string; levelBefore: number; levelAfter: number } | null;
  user: HudUser;
}

export function ClientSim({ path, onBack }: { path: PathWithNodes | null; onBack: () => void }) {
  const [phase, setPhase] = useState<"start" | "chat" | "saving" | "summary">("start");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [round, setRound] = useState<SimRound | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [happiness, setHappiness] = useState(START_HAPPY);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(1);

  const catTitle = path?.title ?? "Virtual Assistant";

  useEffect(() => {
    if (phase === "chat") {
      const el = chatRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, phase]);

  // round timer
  useEffect(() => {
    if (phase !== "chat" || answered) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          timeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answered, round]);

  const push = (m: Omit<ChatMsg, "id">) => setMessages((prev) => [...prev, { ...m, id: msgId.current++ }]);

  const newRound = () => {
    const r = generateRound(catTitle);
    setRound(r);
    setAnswered(false);
    setSelected(null);
    setSecondsLeft(ROUND_SECONDS);
    push({ role: "client", text: r.message });
  };

  const start = () => {
    playSound("chime");
    setHappiness(START_HAPPY);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setRoundCount(0);
    setSessionXp(0);
    setMessages([]);
    msgId.current = 1;
    setPhase("chat");
    newRound();
  };

  const timeout = () => {
    if (answered || !round) return;
    setAnswered(true);
    setSelected(-1);
    const newHappy = Math.max(0, happiness - 1);
    setHappiness(newHappy);
    setStreak(0);
    push({ role: "system", text: `⏰ No answer in time — ${round.client} is getting impatient.`, ok: false });
    if (newHappy <= 0) {
      setTimeout(() => endSession(), 1400);
    }
  };

  const answer = (i: number) => {
    if (answered || !round) return;
    const correct = i === round.correct;
    const trapFall = !correct && round.trap && i === round.trapIndex;
    const delta = correct ? 1 : trapFall ? -2 : -1;
    const newHappy = Math.max(0, Math.min(MAX_HAPPY, happiness + delta));
    const newStreak = correct ? streak + 1 : 0;
    const newBest = Math.max(bestStreak, newStreak);
    const xp = xpForRound(correct, newStreak, secondsLeft);

    answerJuice(correct);
    setAnswered(true);
    setSelected(i);
    setHappiness(newHappy);
    setStreak(newStreak);
    setBestStreak(newBest);
    setCorrectCount((c) => c + (correct ? 1 : 0));
    setRoundCount((c) => c + 1);
    setSessionXp((x) => x + xp);

    push({ role: "you", text: round.options[i] });
    push({
      role: "system",
      text: correct
        ? `${round.client} is delighted! ${round.tip}`
        : trapFall
        ? `🚨 Trap! That one looked helpful but it wasn't. ${round.tip}`
        : `${round.client} is not impressed. ${round.tip}`,
      ok: correct,
      trap: trapFall,
    });

    if (newHappy <= 0) {
      setTimeout(() => endSession(), 1800);
    }
  };

  const next = () => {
    if (!round) return;
    if (happiness <= 0) {
      endSession();
      return;
    }
    newRound();
  };

  const endSession = async () => {
    if (phase === "saving" || phase === "summary") return;
    setPhase("saving");
    try {
      const res = await fetch("/api/learn/client-sim/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xp_earned: sessionXp, rounds: roundCount, correct: correctCount, best_streak: bestStreak, category_id: path?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save failed");
      setSummary(data);
      if (data.rankUp) levelUpJuice();
      else finishJuice();
      setPhase("summary");
    } catch {
      finishJuice();
      setSummary({ xp_earned: sessionXp, rounds: roundCount, correct: correctCount, bestStreak, rankUp: null, user: null as any });
      setPhase("summary");
    }
  };

  const mult = streakMultiplier(streak);

  // ── start screen ──
  if (phase === "start") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 px-4 animate-fade-in">
        <div className="text-6xl mb-4 animate-float">💬</div>
        <h1 className="text-3xl font-extrabold text-white">Client Sim</h1>
        <p className="mt-2 text-white/50 max-w-sm">
          {path?.emoji} {catTitle} — endless client messages, WhatsApp style. Keep them happy, watch your XP multiply.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] font-bold text-white/60">
          <span className="px-3 py-1.5 rounded-full bg-[#2a2d3f]">😍 4-step happy scale</span>
          <span className="px-3 py-1.5 rounded-full bg-[#2a2d3f]">⏱ {ROUND_SECONDS}s per reply</span>
          <span className="px-3 py-1.5 rounded-full bg-[#2a2d3f]">🔥 streak multiplier x{mult}</span>
        </div>
        <p className="mt-3 text-[11px] text-white/40 max-w-xs">
          ⚠️ Watch out — some replies look right but are traps. Let the happiness meter hit 0 and the client storms off.
        </p>
        <button
          onClick={start}
          className="mt-8 px-10 py-4 rounded-2xl bg-dl-green text-white shadow-btn-green font-extrabold text-lg transition-all squishy hover:brightness-105 active:translate-y-1 active:shadow-none"
        >
          Start grinding →
        </button>
        <button onClick={onBack} className="mt-3 text-sm font-bold text-white/50 hover:text-white transition-colors">← Back to my tree</button>
      </div>
    );
  }

  // ── summary screen ──
  if (phase === "summary") {
    return (
      <div className="py-8 px-4 max-w-md mx-auto animate-pop-in">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">{summary?.rankUp ? "👑" : "🎉"}</div>
          <h1 className="text-3xl font-extrabold text-white">
            {summary?.rankUp ? "Rank up!" : "Grind session complete!"}
          </h1>
          <p className="mt-2 text-white/60">{summary?.rankUp ? "Your client sim hustle paid off big." : "Happy clients, fat XP. Nice work."}</p>
        </div>

        <div className="rounded-3xl bg-[#1f2233] border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">⚡</span>
            <RollingNumber value={summary?.xp_earned ?? 0} className="text-3xl font-extrabold text-dl-purpleLight" />
            <span className="text-xl font-extrabold text-dl-purpleLight">XP</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/5">
            <div>
              <p className="text-xl font-extrabold text-white">{summary?.rounds ?? 0}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">rounds</p>
            </div>
            <div>
              <p className="text-xl font-extrabold text-dl-green">{summary?.correct ?? 0}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">happy</p>
            </div>
            <div>
              <p className="text-xl font-extrabold text-dl-gold">🔥{summary?.bestStreak ?? 0}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">best streak</p>
            </div>
          </div>
        </div>

        {summary?.rankUp && (
          <div className="mt-3 rounded-2xl border-kawaii-purple/40 bg-gradient-to-br from-kawaii-purple/10 to-kawaii-pink/10 p-4 text-center">
            <p className="text-lg font-extrabold text-white">
              {summary.user?.rankEmoji} {summary.rankUp.to} · Level {summary.rankUp.levelAfter}
            </p>
          </div>
        )}
        {summary?.user && (
          <div className="mt-3"><RankHud user={summary.user} compact /></div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button onClick={start} className="w-full py-3.5 rounded-2xl bg-dl-green text-white font-extrabold shadow-btn-green hover:brightness-105 transition-all squishy">
            🔁 Another grind session
          </button>
          <button onClick={onBack} className="w-full py-3 rounded-2xl border border-white/15 text-white/75 font-bold hover:bg-white/5 transition-all">
            ← Back to rank mode
          </button>
        </div>
      </div>
    );
  }

  // ── chat screen ──
  return (
    <div className="px-3 pb-4 animate-fade-in">
      {/* top bar: category + happiness + streak + xp + timer */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{path?.emoji ?? "💼"}</span>
          <p className="text-xs font-extrabold text-white truncate">{catTitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-dl-orange" title="Happy streak">
            🔥{streak} <span className="text-white/40">x{mult}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-dl-purpleLight">
            ⚡{sessionXp}
          </span>
        </div>
      </div>

      {/* happiness + timer strip */}
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="inline-flex items-center gap-0.5 text-lg" title="Client happiness">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("transition-all", i <= happiness ? "" : "opacity-20 grayscale")}>{HAPPY_EMOJIS[i]}</span>
          ))}
        </span>
        <div className={cn("flex items-center gap-1 text-sm font-extrabold tabular-nums", secondsLeft <= 5 ? "text-dl-red animate-pulse" : secondsLeft <= 10 ? "text-dl-orange" : "text-white/70")}>
          ⏱ {secondsLeft}s
        </div>
      </div>

      {/* chat window */}
      <div ref={chatRef} className="h-[46vh] overflow-y-auto space-y-2.5 rounded-3xl bg-[#F6F1FA] dark:bg-dark-card/60 border border-kawaii-lavender/20 dark:border-dark-surface p-4">
        {messages.map((m) =>
          m.role === "client" ? (
            <div key={m.id} className="flex items-end gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-sm shrink-0">👤</div>
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-dark-surface text-sm text-white/90 shadow-sm whitespace-pre-wrap">
                {m.text}
              </div>
            </div>
          ) : m.role === "you" ? (
            <div key={m.id} className="flex justify-end animate-fade-in">
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white text-sm shadow-sm whitespace-pre-wrap">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className={cn("max-w-[90%] mx-auto px-4 py-2.5 rounded-2xl text-xs font-semibold animate-pop-in", m.ok ? "bg-kawaii-mint/15 text-emerald-700 dark:text-emerald-300" : m.trap ? "bg-dl-red/15 text-rose-700 dark:text-rose-300 border border-dl-red/30" : "bg-kawaii-coral/15 text-rose-700 dark:text-rose-300")}>
              {m.ok ? "✅ " : m.trap ? "🚨 " : "🤔 "}{m.text}
            </div>
          )
        )}
      </div>

      {/* reply options */}
      <AnimatePresence mode="wait">
        {!answered && round && (
          <motion.div key={round.message} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 space-y-2">
            {round.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => answer(i)}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-kawaii-lavender/40 bg-white dark:bg-dark-card hover:border-kawaii-purple hover:bg-kawaii-lavender/10 transition-all squishy font-semibold text-white/90"
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {answered && (
        <div className="mt-4 flex justify-end">
          <button onClick={next} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-dl-green text-white shadow-btn-green hover:brightness-105 active:translate-y-1 active:shadow-none transition-all squishy">
            {happiness <= 0 ? "See results" : "Next client"} <span>→</span>
          </button>
        </div>
      )}

      <div className="mt-2 flex justify-center">
        <button onClick={endSession} className="text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors">
          End session &amp; bank XP
        </button>
      </div>
    </div>
  );
}
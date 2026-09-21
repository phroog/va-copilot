"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowRight, Flame, Heart, Timer } from "lucide-react";
import type { LessonContent, LessonBlock } from "@/lib/learn/types";
import type { LevelMode } from "@/lib/learn/modes";
import { cn } from "@/lib/utils";
import { answerJuice, finishJuice } from "@/lib/juice";
import { smallBurst } from "@/lib/confetti";
import { playSound } from "@/lib/sounds";
import { startMusic, stopMusic, playRisingCue } from "@/lib/music";
import { formatTime } from "@/lib/learn/performance";

const PRAISE = ["Nice!", "Nailed it!", "You're on fire!", "Boom!", "Client material!", "Too easy!", "That's the pro move!"];
const GENTLE = ["Not quite — here's why.", "Almost! Check this out.", "Good try, learn this:"];

export interface LessonResult {
  accuracy: number;
  stars: number;
  timeSeconds: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function starsFor(accuracy: number): number {
  return accuracy >= 0.9 ? 3 : accuracy >= 0.6 ? 2 : 1;
}

const pick = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
const gentle = () => GENTLE[Math.floor(Math.random() * GENTLE.length)];

// Counts elapsed seconds while `active` is true.
function useElapsed(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now() - elapsed * 1000;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return elapsed;
}

function TimerChip({ elapsed, targetSeconds }: { elapsed: number; targetSeconds: number }) {
  const ratio = targetSeconds > 0 ? elapsed / targetSeconds : 1.5;
  const color = ratio < 0.5 ? "text-dl-green" : ratio < 0.75 ? "text-dl-gold" : ratio < 1 ? "text-dl-orange" : "text-dl-red";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-extrabold tabular-nums", color)}>
      <Timer className="w-4 h-4" /> {formatTime(elapsed)}
      <span className="text-white/30 font-bold">/ {formatTime(targetSeconds)}</span>
    </span>
  );
}

const INTERACTIVE: LessonBlock["type"][] = ["pick", "scenario", "fill", "order"];
const CHAT_TYPES: LessonBlock["type"][] = ["pick", "scenario"];

interface OrderItem {
  text: string;
  originalIndex: number;
}

export function LessonPlayer({
  content,
  xpReward,
  targetSeconds,
  mode,
  onComplete,
}: {
  content: LessonContent;
  xpReward: number;
  targetSeconds?: number;
  mode: LevelMode;
  onComplete: (result: LessonResult) => void;
}) {
  const chatBlocks = content.blocks.filter((b) => CHAT_TYPES.includes(b.type as any));
  const rapidBlocks = content.blocks.filter((b) => INTERACTIVE.includes(b.type as any));

  if (mode === "rapid" && rapidBlocks.length >= 2) {
    return <RapidMode content={content} xpReward={xpReward} targetSeconds={targetSeconds} blocks={rapidBlocks} onComplete={onComplete} />;
  }
  if (mode === "chat" && chatBlocks.length >= 2) {
    return <ChatMode content={content} xpReward={xpReward} targetSeconds={targetSeconds} blocks={chatBlocks} onComplete={onComplete} />;
  }
  return <StoryMode content={content} xpReward={xpReward} targetSeconds={targetSeconds} onComplete={onComplete} />;
}

// ───────────────────────── Story / Mission ─────────────────────────
function StoryMode({
  content,
  xpReward,
  targetSeconds,
  onComplete,
}: {
  content: LessonContent;
  xpReward: number;
  targetSeconds?: number;
  onComplete: (result: LessonResult) => void;
}) {
  const [phase, setPhase] = useState<"intro" | "playing">("intro");
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [fillText, setFillText] = useState("");
  const [orderAnswer, setOrderAnswer] = useState<OrderItem[]>([]);

  const target = targetSeconds ?? (content.blocks.length * 20);
  const elapsed = useElapsed(phase === "playing");

  // Soft ambient during the mission, fades out when it ends.
  useEffect(() => {
    if (phase === "playing") startMusic("lesson");
    else stopMusic();
    return () => stopMusic();
  }, [phase]);

  const blocks = content.blocks;

  // Rising "final push" tone when reaching the top of the level.
  useEffect(() => {
    if (phase === "playing" && idx + 1 >= blocks.length) playRisingCue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);
  const interactiveCount = blocks.filter((b) => INTERACTIVE.includes(b.type as any)).length;
  const block = blocks[idx];
  const isPassive = block?.type === "text" || block?.type === "tip";
  const canContinue = answered || isPassive;

  const shuffledOrder = useMemo(() => {
    if (block?.type === "order") return shuffle(block.items.map((text, originalIndex) => ({ text, originalIndex })));
    return [];
  }, [block]);

  const record = (correct: boolean, explanation: string) => {
    answerJuice(correct);
    setAnswered(true);
    setIsCorrect(correct);
    setFeedback(`${correct ? pick() : gentle()} ${explanation || ""}`.trim());
    if (correct) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => c + 1);
    } else setCombo(0);
  };

  const next = () => {
    if (idx + 1 >= blocks.length) {
      const accuracy = interactiveCount > 0 ? correctCount / interactiveCount : 1;
      finishJuice();
      onComplete({ accuracy, stars: starsFor(accuracy), timeSeconds: elapsed });
    } else {
      const ni = idx + 1;
      setIdx(ni);
      setAnswered(false);
      setIsCorrect(false);
      setFeedback("");
      setSelected(null);
      setFillText("");
      setOrderAnswer([]);
    }
  };

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-4 animate-fade-in">
        <div className="text-6xl mb-4 animate-float">🎯</div>
        <h1 className="text-3xl font-extrabold text-white leading-tight">{content.title}</h1>
        <p className="mt-3 text-white/50 max-w-md">{content.intro}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a2d3f] text-sm font-bold text-dl-purpleLight">
          {blocks.length} steps · +{xpReward} XP
        </div>
        <button
          onClick={() => { playSound("gong"); setPhase("playing"); }}
          className="mt-8 px-10 py-4 rounded-2xl bg-dl-green text-white shadow-btn-green font-extrabold text-lg transition-all squishy hover:brightness-105 active:translate-y-1 active:shadow-none"
        >
          Start Mission →
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="h-2 flex-1 rounded-full bg-[#2a2d3f] overflow-hidden mr-4">
          <div
            className="h-full rounded-full bg-dl-purple transition-all duration-300"
            style={{ width: `${((idx + (canContinue ? 1 : 0)) / blocks.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-dl-orange animate-pop-in">
              <Flame className="w-4 h-4" /> x{combo}
            </span>
          )}
          <TimerChip elapsed={elapsed} targetSeconds={target} />
          <span className="text-xs font-bold text-slate-400">{idx + 1}/{blocks.length}</span>
        </div>
      </div>

      <BlockView
        block={block}
        answered={answered}
        isCorrect={isCorrect}
        selected={selected}
        setSelected={setSelected}
        fillText={fillText}
        setFillText={setFillText}
        orderAnswer={orderAnswer}
        setOrderAnswer={setOrderAnswer}
        shuffledOrder={shuffledOrder}
        onAnswer={record}
        big={false}
      />

      {answered && (
        <div className={cn("mt-4 p-4 rounded-xl border-2 flex items-start gap-3 animate-fade-in", isCorrect ? "border-dl-green bg-dl-green/15" : "border-dl-red bg-dl-red/15")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0", isCorrect ? "bg-dl-green" : "bg-dl-red")}>
            <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ duration: 0.35, ease: "easeOut" }}>
              {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </motion.span>
          </div>
          <p className="text-sm font-semibold text-white/90">{feedback}</p>
        </div>
      )}

      {canContinue && (
        <div className="mt-6 flex justify-end">
          <button onClick={next} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-dl-green text-white shadow-btn-green hover:brightness-105 active:translate-y-1 active:shadow-none transition-all squishy">
            {idx + 1 >= blocks.length ? "See my result" : "Continue"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Rapid Fire ─────────────────────────
function RapidMode({
  content,
  xpReward,
  targetSeconds,
  blocks,
  onComplete,
}: {
  content: LessonContent;
  xpReward: number;
  targetSeconds?: number;
  blocks: LessonBlock[];
  onComplete: (result: LessonResult) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [idx, setIdx] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [fillText, setFillText] = useState("");
  const [orderAnswer, setOrderAnswer] = useState<OrderItem[]>([]);

  const target = targetSeconds ?? (blocks.length * 20);
  const elapsed = useElapsed(phase === "playing");

  // Soft ambient during the mission, fades out when it ends.
  useEffect(() => {
    if (phase === "playing") startMusic("lesson");
    else stopMusic();
    return () => stopMusic();
  }, [phase]);

  const block = blocks[idx];
  const shuffledOrder = useMemo(() => {
    if (block?.type === "order") return shuffle(block.items.map((text, originalIndex) => ({ text, originalIndex })));
    return [];
  }, [block]);

  // Rising "final push" tone when reaching the top of the level.
  useEffect(() => {
    if (phase === "playing" && idx + 1 >= blocks.length) playRisingCue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  const resetRound = () => {
    setAnswered(false);
    setIsCorrect(false);
    setFeedback("");
    setSelected(null);
    setFillText("");
    setOrderAnswer([]);
  };

  const record = (correct: boolean, explanation: string) => {
    answerJuice(correct);
    setAnswered(true);
    setIsCorrect(correct);
    setFeedback(`${correct ? pick() : gentle()} ${explanation || ""}`.trim());
    if (correct) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
      setHearts((h) => h - 1);
    }
  };

  const next = () => {
    if (hearts <= 0) {
      setPhase("over");
      return;
    }
    if (idx + 1 >= blocks.length) {
      const accuracy = correctCount / blocks.length;
      finishJuice();
      onComplete({ accuracy, stars: starsFor(accuracy), timeSeconds: elapsed });
      return;
    }
    setIdx((i) => i + 1);
    resetRound();
  };

  if (phase === "ready") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-4 animate-fade-in">
        <div className="text-6xl mb-4 animate-bounce">⚡</div>
        <h1 className="text-3xl font-extrabold text-white">Rapid Fire!</h1>
        <p className="mt-2 text-white/50 max-w-sm">{content.intro}</p>
        <div className="mt-5 flex items-center gap-2 text-sm font-bold text-white/50">
          <span className="inline-flex items-center gap-1"><Heart className="w-4 h-4 fill-kawaii-coral text-dl-orange" />3 lives</span>
          <span>·</span>
          <span>{blocks.length} quick questions</span>
          <span>·</span>
          <span className="text-dl-purpleLight">+{xpReward} XP</span>
        </div>
        <button
          onClick={() => { playSound("gong"); setPhase("playing"); }}
          className="mt-8 px-10 py-4 rounded-2xl bg-dl-green text-white shadow-btn-green font-extrabold text-lg transition-all squishy hover:brightness-105 active:translate-y-1 active:shadow-none"
        >
          GO! ⚡
        </button>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-4 animate-pop-in">
        <div className="text-6xl mb-3">💔</div>
        <h1 className="text-3xl font-extrabold text-white">Out of lives!</h1>
        <p className="mt-2 text-white/50 max-w-sm">You got {correctCount} of {blocks.length}. Review the explanations and try again — reps make you client-ready.</p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => {
              setPhase("ready");
              setIdx(0);
              setHearts(3);
              setCorrectCount(0);
              setCombo(0);
              resetRound();
            }}
            className="px-6 py-3 rounded-full bg-dl-green text-white shadow-btn-green hover:brightness-105 active:translate-y-1 active:shadow-none transition-all squishy"
          >
            🔄 Retry
          </button>
          <button
            onClick={() => {
              const a = Math.max(0.4, correctCount / blocks.length);
              finishJuice();
              onComplete({ accuracy: a, stars: starsFor(a), timeSeconds: elapsed });
            }}
            className="px-6 py-3 rounded-full border-2 border-kawaii-lavender/40 text-white/75 font-bold hover:bg-kawaii-lavender/10 transition-all squishy"
          >
            Finish ({starsFor(Math.max(0.4, correctCount / blocks.length))} star{starsFor(Math.max(0.4, correctCount / blocks.length)) > 1 ? "s" : ""})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 animate-fade-in">
      {/* HUD: lives, combo, progress */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[1, 2, 3].map((h) => (
            <Heart key={h} className={cn("w-5 h-5 transition-all", h <= hearts ? "fill-kawaii-coral text-dl-orange" : "text-slate-300 dark:text-dark-surface")} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <span className="inline-flex items-center gap-1 text-sm font-extrabold text-dl-orange animate-pop-in">
              <Flame className="w-5 h-5" /> x{combo}
            </span>
          )}
          <TimerChip elapsed={elapsed} targetSeconds={target} />
          <span className="text-xs font-bold text-slate-400">{idx + 1}/{blocks.length}</span>
        </div>
      </div>

      <BlockView
        block={block}
        answered={answered}
        isCorrect={isCorrect}
        selected={selected}
        setSelected={setSelected}
        fillText={fillText}
        setFillText={setFillText}
        orderAnswer={orderAnswer}
        setOrderAnswer={setOrderAnswer}
        shuffledOrder={shuffledOrder}
        onAnswer={record}
        big
      />

      {answered && (
        <div className={cn("mt-4 p-4 rounded-xl border-2 flex items-start gap-3 animate-fade-in", isCorrect ? "border-dl-green bg-dl-green/15" : "border-dl-red bg-dl-red/15")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0", isCorrect ? "bg-dl-green" : "bg-dl-red")}>
            <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ duration: 0.35, ease: "easeOut" }}>
              {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </motion.span>
          </div>
          <p className="text-sm font-semibold text-white/90">{feedback}</p>
        </div>
      )}

      {answered && (
        <div className="mt-6 flex justify-end">
          <button onClick={next} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-dl-green text-white shadow-btn-green hover:brightness-105 active:translate-y-1 active:shadow-none transition-all squishy">
            {idx + 1 >= blocks.length ? "Finish!" : "Next"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Client Chat Sim ─────────────────────────
interface ChatMsg {
  id: number;
  role: "client" | "you" | "reaction";
  text: string;
  ok?: boolean;
}

function ChatMode({
  content,
  xpReward,
  targetSeconds,
  blocks,
  onComplete,
}: {
  content: LessonContent;
  xpReward: number;
  targetSeconds?: number;
  blocks: LessonBlock[];
  onComplete: (result: LessonResult) => void;
}) {
  const [phase, setPhase] = useState<"intro" | "chat">("intro");
  const [idx, setIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(1);

  const target = targetSeconds ?? (blocks.length * 25);
  const elapsed = useElapsed(phase === "chat");

  // Soft ambient during the sim, fades out when it ends.
  useEffect(() => {
    if (phase === "chat") startMusic("lesson");
    else stopMusic();
    return () => stopMusic();
  }, [phase]);

  const block = blocks[idx];
  const options = (block?.type === "pick" || block?.type === "scenario") ? block.options : [];

  // Rising "final push" tone when reaching the top of the level.
  useEffect(() => {
    if (phase === "chat" && idx + 1 >= blocks.length) playRisingCue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  useEffect(() => {
    if (phase === "chat") {
      const el = chatRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, phase]);

  const push = (m: Omit<ChatMsg, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: msgId.current++ }]);
  };

  const start = () => { playSound("chime");
    setPhase("chat");
    setMessages([]);
    setIdx(0);
    setCorrectCount(0);
    setAnswered(false);
    setSelected(null);
    msgId.current = 1;
    const b = blocks[0];
    if (b?.type === "pick" || b?.type === "scenario") push({ role: "client", text: b.prompt });
  };

  const reply = (i: number) => {
    if (answered) return;
    if (!block || (block.type !== "pick" && block.type !== "scenario")) return;
    const correct = i === block.correct;
    answerJuice(correct);
    setSelected(i);
    setAnswered(true);
    push({ role: "you", text: block.options[i] });
    push({
      role: "reaction",
      text: correct ? `Great call! ${block.explanation || "That's exactly what a pro VA would say."}` : `Hmm — not quite. ${block.explanation || "Here's the better move."}`,
      ok: correct,
    });
    if (correct) setCorrectCount((c) => c + 1);
  };

  const next = () => {
    if (idx + 1 >= blocks.length) {
      const accuracy = correctCount / blocks.length;
      finishJuice();
      onComplete({ accuracy, stars: starsFor(accuracy), timeSeconds: elapsed });
      return;
    }
    const ni = idx + 1;
    setIdx(ni);
    setAnswered(false);
    setSelected(null);
    const b = blocks[ni];
    if (b?.type === "pick" || b?.type === "scenario") push({ role: "client", text: b.prompt });
  };

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-4 animate-fade-in">
        <div className="text-6xl mb-4 animate-float">💬</div>
        <h1 className="text-3xl font-extrabold text-white">Client Chat Sim</h1>
        <p className="mt-2 text-white/50 max-w-sm">A client just messaged you. Pick the reply that would make a real VA shine. {content.intro}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a2d3f] text-sm font-bold text-dl-purpleLight">
          {blocks.length} conversations · +{xpReward} XP
        </div>
        <button
          onClick={start}
          className="mt-8 px-10 py-4 rounded-2xl bg-dl-green text-white shadow-btn-green font-extrabold text-lg transition-all squishy hover:brightness-105 active:translate-y-1 active:shadow-none"
        >
          Open chat →
        </button>
      </div>
    );
  }

  return (
    <div className="py-4 px-3 animate-fade-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-bold text-slate-400">💬 Live client sim</p>
        <div className="flex items-center gap-3">
          <TimerChip elapsed={elapsed} targetSeconds={target} />
          <span className="text-xs font-bold text-slate-400">{idx + 1}/{blocks.length}</span>
        </div>
      </div>

      <div ref={chatRef} className="h-[52vh] overflow-y-auto space-y-3 rounded-3xl bg-[#F6F1FA] dark:bg-dark-card/60 border border-kawaii-lavender/20 dark:border-dark-surface p-4">
        {messages.map((m) =>
          m.role === "client" ? (
            <div key={m.id} className="flex items-end gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-sm shrink-0">👤</div>
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-dark-surface text-sm text-white/90 shadow-sm">
                {m.text}
              </div>
            </div>
          ) : m.role === "you" ? (
            <div key={m.id} className="flex justify-end animate-fade-in">
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white text-sm shadow-sm">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className={cn("max-w-[85%] mx-auto px-4 py-2.5 rounded-2xl text-xs font-semibold animate-pop-in", m.ok ? "bg-kawaii-mint/15 text-emerald-700 dark:text-emerald-300" : "bg-kawaii-coral/15 text-rose-700 dark:text-rose-300")}>
              {m.ok ? "✅ " : "🤔 "}{m.text}
            </div>
          )
        )}
      </div>

      {/* reply options */}
      {!answered && options.length > 0 && (
        <div className="mt-3 space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => reply(i)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border-2 transition-all squishy font-semibold text-white/90",
                "border-kawaii-lavender/40 bg-white dark:bg-dark-card hover:border-kawaii-purple hover:bg-kawaii-lavender/10"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {answered && (
        <div className="mt-4 flex justify-end">
          <button onClick={next} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-dl-green text-white shadow-btn-green hover:brightness-105 active:translate-y-1 active:shadow-none transition-all squishy">
            {idx + 1 >= blocks.length ? "Finish" : "Next message"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── shared block renderer ─────────────────────────
function BlockView(props: {
  block: LessonBlock;
  answered: boolean;
  isCorrect: boolean;
  selected: number | null;
  setSelected: (n: number) => void;
  fillText: string;
  setFillText: (s: string) => void;
  orderAnswer: OrderItem[];
  setOrderAnswer: (i: OrderItem[]) => void;
  shuffledOrder: OrderItem[];
  onAnswer: (correct: boolean, explanation: string) => void;
  big: boolean;
}) {
  const { block } = props;

  if (block.type === "text") {
    return (
      <div className="p-6 rounded-2xl bg-[#1f2233] border border-white/10">
        <h2 className="text-xl font-extrabold text-white mb-2">{block.heading}</h2>
        <p className="text-white/75 leading-relaxed">{block.body}</p>
      </div>
    );
  }
  if (block.type === "tip") {
    return (
      <div className="p-5 rounded-2xl bg-dl-gold/10 border border-dl-gold/30">
        <p className="text-white/90 font-semibold">💡 {block.text}</p>
      </div>
    );
  }
  if (block.type === "reveal") {
    return (
      <div className="p-6 rounded-2xl bg-[#1f2233] border border-white/10 text-center">
        {!props.answered ? (
          <button
            onClick={() => props.onAnswer(true, "")}
            className="px-6 py-3 rounded-full bg-kawaii-lavender/30 dark:bg-dark-surface font-bold text-dl-purpleLight hover:bg-kawaii-lavender/50 transition-all squishy"
          >
            {block.label}
          </button>
        ) : (
          <p className="text-white/90 font-semibold animate-fade-in">✨ {block.content}</p>
        )}
      </div>
    );
  }

  if (block.type === "pick" || block.type === "scenario") {
    const isScenario = block.type === "scenario";
    return (
      <div className="p-6 rounded-2xl bg-[#1f2233] border border-white/10">
        <p className="text-sm font-bold text-dl-purpleLight mb-1">{isScenario ? "🎬 Quick scenario" : "❓ Your move"}</p>
        <h3 className={cn("font-extrabold text-white mb-4", props.big ? "text-xl" : "text-lg")}>{block.prompt}</h3>
        <div className="space-y-2">
          {block.options.map((opt, i) => {
            const isSelected = props.selected === i;
            const showCorrect = props.answered && i === block.correct;
            const showWrong = props.answered && isSelected && i !== block.correct;
            return (
              <button
                key={i}
                disabled={props.answered}
                onClick={(e) => {
                  props.setSelected(i);
                  const correct = i === block.correct;
                  props.onAnswer(correct, block.explanation);
                  if (correct) smallBurst(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
                }}
                className={cn(
                  "w-full text-left rounded-2xl transition-all squishy font-extrabold",
                  props.big ? "px-5 py-4 text-base" : "px-4 py-3",
                  !props.answered && "bg-white text-dl-grey shadow-btn-white hover:brightness-95 active:translate-y-1 active:shadow-none",
                  showCorrect && "bg-dl-green text-white shadow-btn-green",
                  showWrong && "bg-dl-red text-white shadow-btn-red animate-shake",
                  props.answered && !showCorrect && !showWrong && "bg-[#2a2d3f] text-white/30"
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "fill") {
    return (
      <div className="p-6 rounded-2xl bg-[#1f2233] border border-white/10">
        <p className="text-sm font-bold text-dl-purpleLight mb-1">✍️ Fill the blank</p>
        <h3 className="text-lg font-extrabold text-white mb-4">{block.prompt}</h3>
        <input
          autoFocus
          value={props.fillText}
          disabled={props.answered}
          onChange={(e) => props.setFillText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !props.answered && props.fillText.trim()) {
              const correct = block.answers.some((a) => a.toLowerCase().trim() === props.fillText.toLowerCase().trim());
              props.onAnswer(correct, block.explanation);
              if (correct) smallBurst(window.innerWidth / 2, window.innerHeight / 2);
            }
          }}
          placeholder="Type your answer…"
          className="w-full h-12 px-4 rounded-xl border-2 border-kawaii-lavender/40 bg-white dark:bg-dark-card text-white text-center font-bold focus:border-kawaii-purple outline-none"
        />
        {!props.answered && (
          <button
            onClick={(e) => {
              if (props.fillText.trim()) {
                const correct = block.answers.some((a) => a.toLowerCase().trim() === props.fillText.toLowerCase().trim());
                props.onAnswer(correct, block.explanation);
                if (correct) smallBurst(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
              }
            }}
            className="mt-3 w-full py-2.5 rounded-full bg-kawaii-purple text-white font-bold hover:bg-purple-400 transition-all squishy"
          >
            Check
          </button>
        )}
      </div>
    );
  }

  if (block.type === "order") {
    const pool = props.shuffledOrder.filter((item) => !props.orderAnswer.some((a) => a.originalIndex === item.originalIndex));
    return (
      <div className="p-6 rounded-2xl bg-[#1f2233] border border-white/10">
        <p className="text-sm font-bold text-dl-purpleLight mb-1">🔀 Put these in order</p>
        <h3 className="text-lg font-extrabold text-white mb-4">{block.prompt}</h3>
        <div className="space-y-2 mb-3">
          {props.orderAnswer.map((item, i) => (
            <button
              key={item.originalIndex}
              onClick={() => {
                if (props.answered) return;
                props.setOrderAnswer(props.orderAnswer.filter((_, j) => j !== i));
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2a2d3f] font-semibold text-white/90"
            >
              <span className="w-5 h-5 rounded-full bg-kawaii-purple text-white text-xs flex items-center justify-center shrink-0">{i + 1}</span>
              {item.text}
            </button>
          ))}
          {props.orderAnswer.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Tap the steps below in the correct order ↓</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {pool.map((item) => (
            <button
              key={item.originalIndex}
              disabled={props.answered}
              onClick={(e) => {
                const na = [...props.orderAnswer, item];
                props.setOrderAnswer(na);
                if (na.length === block.items.length) {
                  const correct = na.every((it, i) => it.originalIndex === i);
                  props.onAnswer(correct, block.explanation);
                  if (correct) smallBurst(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
                }
              }}
              className="px-4 py-2 rounded-xl border-2 border-kawaii-lavender/40 bg-white/60 dark:bg-dark-surface/40 font-semibold text-white/90 hover:border-kawaii-purple transition-all squishy"
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
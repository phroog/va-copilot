"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, ArrowRight, Flame, Heart } from "lucide-react";
import type { LessonContent, LessonBlock } from "@/lib/learn/types";
import type { LevelMode } from "@/lib/learn/modes";
import { cn } from "@/lib/utils";

const PRAISE = ["Nice!", "Nailed it!", "You're on fire!", "Boom!", "Client material!", "Too easy!", "That's the pro move!"];
const GENTLE = ["Not quite — here's why.", "Almost! Check this out.", "Good try, learn this:"];

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

const INTERACTIVE: LessonBlock["type"][] = ["pick", "scenario", "fill", "order"];
const CHAT_TYPES: LessonBlock["type"][] = ["pick", "scenario"];

interface OrderItem {
  text: string;
  originalIndex: number;
}

export function LessonPlayer({
  content,
  xpReward,
  mode,
  onComplete,
}: {
  content: LessonContent;
  xpReward: number;
  mode: LevelMode;
  onComplete: (result: { accuracy: number; stars: number }) => void;
}) {
  const chatBlocks = content.blocks.filter((b) => CHAT_TYPES.includes(b.type as any));
  const rapidBlocks = content.blocks.filter((b) => INTERACTIVE.includes(b.type as any));

  if (mode === "rapid" && rapidBlocks.length >= 2) {
    return <RapidMode content={content} xpReward={xpReward} blocks={rapidBlocks} onComplete={onComplete} />;
  }
  if (mode === "chat" && chatBlocks.length >= 2) {
    return <ChatMode content={content} xpReward={xpReward} blocks={chatBlocks} onComplete={onComplete} />;
  }
  return <StoryMode content={content} xpReward={xpReward} onComplete={onComplete} />;
}

// ───────────────────────── Story / Mission ─────────────────────────
function StoryMode({
  content,
  xpReward,
  onComplete,
}: {
  content: LessonContent;
  xpReward: number;
  onComplete: (result: { accuracy: number; stars: number }) => void;
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

  const blocks = content.blocks;
  const interactiveCount = blocks.filter((b) => INTERACTIVE.includes(b.type as any)).length;
  const block = blocks[idx];

  const shuffledOrder = useMemo(() => {
    if (block?.type === "order") return shuffle(block.items.map((text, originalIndex) => ({ text, originalIndex })));
    return [];
  }, [block]);

  const record = (correct: boolean, explanation: string) => {
    setAnswered(true);
    setIsCorrect(correct);
    setFeedback(explanation || (correct ? pick() : gentle()));
    if (correct) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => c + 1);
    } else setCombo(0);
  };

  const next = () => {
    if (idx + 1 >= blocks.length) {
      const accuracy = interactiveCount > 0 ? correctCount / interactiveCount : 1;
      onComplete({ accuracy, stars: starsFor(accuracy) });
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
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{content.title}</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-md">{content.intro}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender">
          {blocks.length} steps · +{xpReward} XP
        </div>
        <button
          onClick={() => setPhase("playing")}
          className="mt-8 px-10 py-4 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-lg shadow-lg shadow-kawaii-purple/30 hover:from-purple-400 hover:to-pink-400 transition-all animate-glow-pulse"
        >
          Start Mission →
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="h-2 flex-1 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface overflow-hidden mr-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-300"
            style={{ width: `${((idx + (answered ? 1 : 0)) / blocks.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-kawaii-coral animate-pop-in">
              <Flame className="w-4 h-4" /> x{combo}
            </span>
          )}
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
        <div className={cn("mt-4 p-4 rounded-xl border-2 flex items-start gap-3 animate-fade-in", isCorrect ? "border-kawaii-mint bg-kawaii-mint/10" : "border-kawaii-coral bg-kawaii-coral/10")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0", isCorrect ? "bg-kawaii-mint" : "bg-kawaii-coral")}>
            {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{feedback}</p>
        </div>
      )}

      {answered && (
        <div className="mt-6 flex justify-end">
          <button onClick={next} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-kawaii-purple text-white font-bold shadow-lg shadow-kawaii-purple/20 hover:bg-purple-400 transition-all squishy">
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
  blocks,
  onComplete,
}: {
  content: LessonContent;
  xpReward: number;
  blocks: LessonBlock[];
  onComplete: (result: { accuracy: number; stars: number }) => void;
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

  const block = blocks[idx];
  const shuffledOrder = useMemo(() => {
    if (block?.type === "order") return shuffle(block.items.map((text, originalIndex) => ({ text, originalIndex })));
    return [];
  }, [block]);

  const resetRound = () => {
    setAnswered(false);
    setIsCorrect(false);
    setFeedback("");
    setSelected(null);
    setFillText("");
    setOrderAnswer([]);
  };

  const record = (correct: boolean, explanation: string) => {
    setAnswered(true);
    setIsCorrect(correct);
    setFeedback(explanation || (correct ? pick() : gentle()));
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
      onComplete({ accuracy, stars: starsFor(accuracy) });
      return;
    }
    setIdx((i) => i + 1);
    resetRound();
  };

  if (phase === "ready") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 px-4 animate-fade-in">
        <div className="text-6xl mb-4 animate-bounce">⚡</div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Rapid Fire!</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">{content.intro}</p>
        <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><Heart className="w-4 h-4 fill-kawaii-coral text-kawaii-coral" />3 lives</span>
          <span>·</span>
          <span>{blocks.length} quick questions</span>
          <span>·</span>
          <span className="text-kawaii-purple dark:text-kawaii-lavender">+{xpReward} XP</span>
        </div>
        <button
          onClick={() => setPhase("playing")}
          className="mt-8 px-10 py-4 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-lg shadow-lg shadow-kawaii-purple/30 hover:from-purple-400 hover:to-pink-400 transition-all animate-glow-pulse"
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
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Out of lives!</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">You got {correctCount} of {blocks.length}. Review the explanations and try again — reps make you client-ready.</p>
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
            className="px-6 py-3 rounded-full bg-kawaii-purple text-white font-bold shadow-lg shadow-kawaii-purple/20 hover:bg-purple-400 transition-all squishy"
          >
            🔄 Retry
          </button>
          <button
            onClick={() => {
              const a = Math.max(0.4, correctCount / blocks.length);
              onComplete({ accuracy: a, stars: starsFor(a) });
            }}
            className="px-6 py-3 rounded-full border-2 border-kawaii-lavender/40 text-slate-600 dark:text-slate-300 font-bold hover:bg-kawaii-lavender/10 transition-all squishy"
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
            <Heart key={h} className={cn("w-5 h-5 transition-all", h <= hearts ? "fill-kawaii-coral text-kawaii-coral" : "text-slate-300 dark:text-dark-surface")} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <span className="inline-flex items-center gap-1 text-sm font-extrabold text-kawaii-coral animate-pop-in">
              <Flame className="w-5 h-5" /> x{combo}
            </span>
          )}
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
        <div className={cn("mt-4 p-4 rounded-xl border-2 flex items-start gap-3 animate-fade-in", isCorrect ? "border-kawaii-mint bg-kawaii-mint/10" : "border-kawaii-coral bg-kawaii-coral/10")}>
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0", isCorrect ? "bg-kawaii-mint" : "bg-kawaii-coral")}>
            {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{feedback}</p>
        </div>
      )}

      {answered && (
        <div className="mt-6 flex justify-end">
          <button onClick={next} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-kawaii-purple text-white font-bold shadow-lg shadow-kawaii-purple/20 hover:bg-purple-400 transition-all squishy">
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
  blocks,
  onComplete,
}: {
  content: LessonContent;
  xpReward: number;
  blocks: LessonBlock[];
  onComplete: (result: { accuracy: number; stars: number }) => void;
}) {
  const [phase, setPhase] = useState<"intro" | "chat">("intro");
  const [idx, setIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(1);

  const block = blocks[idx];
  const options = (block?.type === "pick" || block?.type === "scenario") ? block.options : [];

  useEffect(() => {
    if (phase === "chat") {
      const el = chatRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, phase]);

  const push = (m: Omit<ChatMsg, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: msgId.current++ }]);
  };

  const start = () => {
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
      onComplete({ accuracy, stars: starsFor(accuracy) });
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
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Client Chat Sim</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">A client just messaged you. Pick the reply that would make a real VA shine. {content.intro}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender">
          {blocks.length} conversations · +{xpReward} XP
        </div>
        <button
          onClick={start}
          className="mt-8 px-10 py-4 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold text-lg shadow-lg shadow-kawaii-purple/30 hover:from-purple-400 hover:to-pink-400 transition-all animate-glow-pulse"
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
        <span className="text-xs font-bold text-slate-400">{idx + 1}/{blocks.length}</span>
      </div>

      <div ref={chatRef} className="h-[52vh] overflow-y-auto space-y-3 rounded-3xl bg-[#F6F1FA] dark:bg-dark-card/60 border border-kawaii-lavender/20 dark:border-dark-surface p-4">
        {messages.map((m) =>
          m.role === "client" ? (
            <div key={m.id} className="flex items-end gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-sm shrink-0">👤</div>
              <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-dark-surface text-sm text-slate-700 dark:text-slate-200 shadow-sm">
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
                "w-full text-left px-4 py-3 rounded-xl border-2 transition-all squishy font-semibold text-slate-700 dark:text-slate-200",
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
          <button onClick={next} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-kawaii-purple text-white font-bold shadow-lg shadow-kawaii-purple/20 hover:bg-purple-400 transition-all squishy">
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
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/30 dark:border-dark-surface">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">{block.heading}</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{block.body}</p>
      </div>
    );
  }
  if (block.type === "tip") {
    return (
      <div className="p-5 rounded-2xl bg-kawaii-peach/20 dark:bg-dark-surface border border-kawaii-coral/30">
        <p className="text-slate-700 dark:text-slate-200 font-semibold">💡 {block.text}</p>
      </div>
    );
  }
  if (block.type === "reveal") {
    return (
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/30 dark:border-dark-surface text-center">
        {!props.answered ? (
          <button
            onClick={() => props.onAnswer(true, "")}
            className="px-6 py-3 rounded-full bg-kawaii-lavender/30 dark:bg-dark-surface font-bold text-kawaii-purple dark:text-kawaii-lavender hover:bg-kawaii-lavender/50 transition-all squishy"
          >
            {block.label}
          </button>
        ) : (
          <p className="text-slate-700 dark:text-slate-200 font-semibold animate-fade-in">✨ {block.content}</p>
        )}
      </div>
    );
  }

  if (block.type === "pick" || block.type === "scenario") {
    const isScenario = block.type === "scenario";
    return (
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/30 dark:border-dark-surface">
        <p className="text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender mb-1">{isScenario ? "🎬 Quick scenario" : "❓ Your move"}</p>
        <h3 className={cn("font-extrabold text-slate-800 dark:text-slate-100 mb-4", props.big ? "text-xl" : "text-lg")}>{block.prompt}</h3>
        <div className="space-y-2">
          {block.options.map((opt, i) => {
            const isSelected = props.selected === i;
            const showCorrect = props.answered && i === block.correct;
            const showWrong = props.answered && isSelected && i !== block.correct;
            return (
              <button
                key={i}
                disabled={props.answered}
                onClick={() => {
                  props.setSelected(i);
                  props.onAnswer(i === block.correct, block.explanation);
                }}
                className={cn(
                  "w-full text-left rounded-xl border-2 transition-all squishy font-semibold text-slate-700 dark:text-slate-200",
                  props.big ? "px-5 py-4 text-base" : "px-4 py-3",
                  !props.answered && "border-kawaii-lavender/30 hover:border-kawaii-purple/60 hover:bg-kawaii-lavender/10 bg-white/60 dark:bg-dark-surface/40",
                  showCorrect && "border-kawaii-mint bg-kawaii-mint/15 text-slate-800",
                  showWrong && "border-kawaii-coral bg-kawaii-coral/15",
                  props.answered && !showCorrect && !showWrong && "border-kawaii-lavender/20 opacity-50"
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
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/30 dark:border-dark-surface">
        <p className="text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender mb-1">✍️ Fill the blank</p>
        <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-4">{block.prompt}</h3>
        <input
          autoFocus
          value={props.fillText}
          disabled={props.answered}
          onChange={(e) => props.setFillText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !props.answered && props.fillText.trim()) {
              const correct = block.answers.some((a) => a.toLowerCase().trim() === props.fillText.toLowerCase().trim());
              props.onAnswer(correct, block.explanation);
            }
          }}
          placeholder="Type your answer…"
          className="w-full h-12 px-4 rounded-xl border-2 border-kawaii-lavender/40 bg-white dark:bg-dark-card text-slate-800 dark:text-slate-100 text-center font-bold focus:border-kawaii-purple outline-none"
        />
        {!props.answered && (
          <button
            onClick={() => {
              if (props.fillText.trim()) {
                const correct = block.answers.some((a) => a.toLowerCase().trim() === props.fillText.toLowerCase().trim());
                props.onAnswer(correct, block.explanation);
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
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/30 dark:border-dark-surface">
        <p className="text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender mb-1">🔀 Put these in order</p>
        <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-4">{block.prompt}</h3>
        <div className="space-y-2 mb-3">
          {props.orderAnswer.map((item, i) => (
            <button
              key={item.originalIndex}
              onClick={() => {
                if (props.answered) return;
                props.setOrderAnswer(props.orderAnswer.filter((_, j) => j !== i));
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-kawaii-lavender/20 dark:bg-dark-surface font-semibold text-slate-700 dark:text-slate-200"
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
              onClick={() => {
                const na = [...props.orderAnswer, item];
                props.setOrderAnswer(na);
                if (na.length === block.items.length) {
                  const correct = na.every((it, i) => it.originalIndex === i);
                  props.onAnswer(correct, block.explanation);
                }
              }}
              className="px-4 py-2 rounded-xl border-2 border-kawaii-lavender/40 bg-white/60 dark:bg-dark-surface/40 font-semibold text-slate-700 dark:text-slate-200 hover:border-kawaii-purple transition-all squishy"
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
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/context";
import { useFocusTimer } from "@/components/focus-timer-provider";
import { MiniGamesDialog } from "@/components/mini-games/game-engine";

interface Pet {
  pet_name: string;
  hunger: number;
  happiness: number;
}

const SOUNDS = [
  { id: "lofi", label: "Lo-Fi", emoji: "🎵", videoId: "jfKfPfyJRdk" },
  { id: "rain", label: "Rain", emoji: "🌧️", videoId: "mPZkdNFkNps" },
  { id: "coffee", label: "Coffee", emoji: "☕", videoId: "VMAPTo7RQCo" },
  { id: "nature", label: "Nature", emoji: "🌿", videoId: "nDq6T2Ei2Ac" },
];

export default function MochiHub() {
  const { t } = useLocale();
  const focusTimer = useFocusTimer();
  const [open, setOpen] = useState(false);

  // Pet state
  const [pet, setPet] = useState<Pet | null>(null);
  const [petMessage, setPetMessage] = useState("");
  const [hearts, setHearts] = useState<number[]>([]);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [victoryDance, setVictoryDance] = useState(false);
  const [petLoading, setPetLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sounds state
  const [activeSound, setActiveSound] = useState<string | null>(null);

  const fetchPet = useCallback(async () => {
    try {
      const res = await fetch("/api/pet");
      const data = await res.json();
      setPet(data.pet);
    } catch {} finally { setPetLoading(false); }
  }, []);

  useEffect(() => { if (open) { fetchPet(); fetchBalance(); } }, [open, fetchPet]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchBalance = async () => {
    try { const r = await fetch("/api/ai/credits"); if (r.ok) { const d = await r.json(); setBalance(d.balance); } } catch {}
  };

  const doPetAction = async (action: string) => {
    if (!pet) return;
    const res = await fetch("/api/pet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.pet) setPet(data.pet);
    if (data.message) { setPetMessage(data.message); setTimeout(() => setPetMessage(""), 2000); }
  };

  const burstHearts = () => {
    const id = Date.now();
    setHearts((prev) => [...prev, id]);
    if (pet && pet.happiness < 100) doPetAction("play");
    setTimeout(() => setHearts((prev) => prev.filter((h) => h !== id)), 1200);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/mochi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setBalance(data.balance);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Mochi error" }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error" }]);
    } finally { setChatLoading(false); }
  };

  const petState = pet
    ? pet.hunger < 30 ? "hungry" : pet.happiness < 40 ? "sad" : pet.happiness > 80 ? "happy" : "idle"
    : "idle";

  const animClass = victoryDance ? "animate-victory" : petState === "hungry" ? "animate-shake-slow" : petState === "happy" ? "animate-bounce" : "animate-float";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink shadow-lg shadow-kawaii-purple/20 flex items-center justify-center text-xl squishy animate-float hover:scale-110 transition-transform"
        title="Mochi"
      >
        🐾
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <span>{pet?.pet_name ?? "Mochi"}</span>
              {focusTimer.mode === "focus" && <span className="text-xs text-kawaii-pink animate-pulse">🛡️</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {/* Pet Section */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-kawaii-lavender/10 dark:bg-dark-surface/30">
              <div className={`${animClass} shrink-0`}>
                <svg viewBox="0 0 60 60" width={48} height={48}>
                  <circle cx="30" cy="30" r="26" fill={petState === "hungry" ? "#f5c6a0" : "#ffdbbe"} stroke="#f0b88a" strokeWidth="1.5" />
                  <ellipse cx="10" cy="12" rx="7" ry="9" fill={petState === "hungry" ? "#f5c6a0" : "#ffdbbe"} stroke="#f0b88a" strokeWidth="1" transform="rotate(-20, 10, 12)" />
                  <ellipse cx="50" cy="12" rx="7" ry="9" fill={petState === "hungry" ? "#f5c6a0" : "#ffdbbe"} stroke="#f0b88a" strokeWidth="1" transform="rotate(20, 50, 12)" />
                  <ellipse cx="10" cy="12" rx="4" ry="5" fill="#f8bbd0" transform="rotate(-20, 10, 12)" />
                  <ellipse cx="50" cy="12" rx="4" ry="5" fill="#f8bbd0" transform="rotate(20, 50, 12)" />
                  {petState === "happy" ? (
                    <><path d="M19 26 Q22 22 25 26" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" /><path d="M35 26 Q38 22 41 26" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" /></>
                  ) : petState === "hungry" ? (
                    <><circle cx="22" cy="26" r="2.5" fill="#555" /><circle cx="38" cy="26" r="2.5" fill="#555" /></>
                  ) : (
                    <><circle cx="22" cy="26" r="3" fill="#333" /><circle cx="38" cy="26" r="3" fill="#333" /><circle cx="23" cy="25" r="1" fill="white" /><circle cx="39" cy="25" r="1" fill="white" /></>
                  )}
                  <ellipse cx="14" cy="34" rx="5" ry="3" fill={petState === "happy" ? "rgba(255,182,193,0.6)" : "rgba(255,182,193,0.3)"} />
                  <ellipse cx="46" cy="34" rx="5" ry="3" fill={petState === "happy" ? "rgba(255,182,193,0.6)" : "rgba(255,182,193,0.3)"} />
                  {petState === "happy" ? (
                    <path d="M24 37 Q30 43 36 37" fill="none" stroke="#e57373" strokeWidth="2" strokeLinecap="round" />
                  ) : petState === "sad" ? (
                    <path d="M26 40 Q30 37 34 40" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
                  ) : petState === "hungry" ? (
                    <path d="M24 39 Q30 36 36 39" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
                  ) : (
                    <path d="M24 38 Q30 42 36 38" fill="none" stroke="#e57373" strokeWidth="1.5" strokeLinecap="round" />
                  )}
                  <line x1="8" y1="30" x2="16" y2="32" stroke="#ddd" strokeWidth="0.8" />
                  <line x1="8" y1="34" x2="16" y2="34" stroke="#ddd" strokeWidth="0.8" />
                  <line x1="52" y1="30" x2="44" y2="32" stroke="#ddd" strokeWidth="0.8" />
                  <line x1="52" y1="34" x2="44" y2="34" stroke="#ddd" strokeWidth="0.8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span>🍽️</span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-dark-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-kawaii-coral to-kawaii-pink transition-all duration-500" style={{ width: `${pet?.hunger ?? 0}%` }} />
                  </div>
                  <span className="font-medium text-slate-500">{pet?.hunger ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span>💖</span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-dark-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-500" style={{ width: `${pet?.happiness ?? 0}%` }} />
                  </div>
                  <span className="font-medium text-slate-500">{pet?.happiness ?? 0}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => doPetAction("feed")}>🍣</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={burstHearts}>🎾</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => setGamesOpen(true)}>🎮</Button>
                </div>
              </div>
            </div>

            {/* Pet message */}
            {petMessage && <p className="text-xs text-kawaii-purple text-center animate-fade-in">{petMessage}</p>}

            {/* Chat Section */}
            <div ref={scrollRef} className="overflow-y-auto space-y-2 p-1 min-h-[200px] max-h-[250px]">
              {messages.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">{t("mochiNoMessages")}</p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-kawaii-purple text-white rounded-br-md"
                      : "bg-kawaii-lavender/20 dark:bg-dark-surface/50 text-slate-700 dark:text-slate-200 rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-2.5 rounded-2xl rounded-bl-md bg-kawaii-lavender/20 dark:bg-dark-surface/50 text-sm text-slate-400 animate-pulse">
                    {t("mochiThinking")}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("mochiInputPlaceholder")} disabled={chatLoading} className="flex-1" />
              <Button type="submit" variant="primary" size="sm" disabled={chatLoading || !input.trim()}>{t("send")}</Button>
            </form>

            {/* Sounds Section */}
            <div className="flex flex-wrap gap-1.5">
              {SOUNDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSound(activeSound === s.id ? null : s.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all squishy ${
                    activeSound === s.id
                      ? "bg-kawaii-lavender/40 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender"
                      : "bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface text-slate-500 dark:text-slate-400 hover:bg-kawaii-lavender/20"
                  }`}
                >
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
            {activeSound && (
              <div className="rounded-2xl overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${SOUNDS.find((s) => s.id === activeSound)?.videoId}?autoplay=1&loop=1&playlist=${SOUNDS.find((s) => s.id === activeSound)?.videoId}`}
                  className="w-full h-32"
                  allow="autoplay"
                  allowFullScreen
                />
              </div>
            )}

            {/* Balance */}
            {balance !== null && (
              <p className="text-xs text-slate-400 text-center">💎 {balance} {t("credits")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mini Games Dialog (kept separate for clarity) */}
      <Dialog open={gamesOpen} onOpenChange={(o) => { setGamesOpen(o); if (!o) { setVictoryDance(true); setTimeout(() => setVictoryDance(false), 1000); } }}>
        <DialogContent className="sm:max-w-[360px] border-2 border-kawaii-lavender/40">
          <DialogHeader><DialogTitle className="text-center">🎮 Mini Games</DialogTitle></DialogHeader>
          <MiniGamesDialog onGameEnd={(score: number) => { if (score > 5 && pet && pet.happiness < 100) doPetAction("play"); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}

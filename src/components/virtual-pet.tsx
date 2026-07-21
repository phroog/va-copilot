"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MiniGamesDialog } from "@/components/mini-games/game-engine";
import { useFocusTimer } from "@/components/focus-timer-provider";

interface Pet {
  pet_name: string;
  hunger: number;
  happiness: number;
}

export default function VirtualPet() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const focusTimer = useFocusTimer();
  const [minimized, setMinimized] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("pet-minimized") === "true";
    return false;
  });
  const [hearts, setHearts] = useState<number[]>([]);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [victoryDance, setVictoryDance] = useState(false);

  const fetchPet = useCallback(async () => {
    try {
      const res = await fetch("/api/pet");
      const data = await res.json();
      setPet(data.pet);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPet(); }, [fetchPet]);

  const doAction = async (action: string, extra?: Record<string, string>) => {
    if (!pet) return;
    const res = await fetch("/api/pet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (data.pet) setPet(data.pet);
    if (data.message) {
      setMessage(data.message);
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const toggleMinimized = () => {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem("pet-minimized", String(next));
  };

  const burstHearts = () => {
    const id = Date.now();
    setHearts((prev) => [...prev, id]);
    if (pet && pet.happiness < 100) {
      doAction("play");
    }
    setTimeout(() => setHearts((prev) => prev.filter((h) => h !== id)), 1200);
  };

  const handleGameEnd = async (score: number) => {
    if (score > 5 && pet && pet.happiness < 100) {
      doAction("play");
    }
  };

  const handleGamesClose = () => {
    setGamesOpen(false);
    setVictoryDance(true);
    setTimeout(() => setVictoryDance(false), 1000);
  };

  if (loading) return null;

  if (minimized) {
    return (
      <button
        onClick={toggleMinimized}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-kawaii-lavender to-kawaii-pink shadow-lg shadow-kawaii-purple/20 flex items-center justify-center text-xl squishy animate-float"
        title="Open Mochi"
      >
        🐾
      </button>
    );
  }

  const petState = pet
    ? pet.hunger < 30
      ? "hungry"
      : pet.happiness < 40
      ? "sad"
      : pet.happiness > 80
      ? "happy"
      : "idle"
    : "idle";

  const animClass = victoryDance
    ? "animate-victory"
    : petState === "hungry"
    ? "animate-shake-slow"
    : petState === "happy"
    ? "animate-bounce"
    : "animate-float";

  const faceColor = petState === "hungry" ? "#f5c6a0" : "#ffdbbe";
  const blushColor = petState === "happy" ? "rgba(255,182,193,0.6)" : "rgba(255,182,193,0.3)";

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="relative group">
        <button
          onClick={toggleMinimized}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 text-white text-xs flex items-center justify-center hover:bg-slate-400 z-10 squishy"
        >
          ✕
        </button>
        <div className="bg-gradient-to-br from-kawaii-peach/80 via-white/90 to-kawaii-lavender/80 dark:from-dark-card dark:via-dark-card dark:to-dark-surface border border-kawaii-lavender/30 dark:border-dark-surface rounded-3xl p-4 shadow-xl shadow-kawaii-purple/10 w-48">
          <div className="text-center mb-2">
            <div className="relative inline-block">
              {/* CSS Pet Character */}
              <div className={`${animClass}`} style={{ width: 60, height: 60, margin: "0 auto" }}>
                <svg viewBox="0 0 60 60" width={60} height={60}>
                  {/* Body / Head */}
                  <circle cx="30" cy="30" r="26" fill={faceColor} stroke="#f0b88a" strokeWidth="1.5" />
                  {/* Ears */}
                  <ellipse cx="10" cy="12" rx="7" ry="9" fill={faceColor} stroke="#f0b88a" strokeWidth="1" transform="rotate(-20, 10, 12)" />
                  <ellipse cx="50" cy="12" rx="7" ry="9" fill={faceColor} stroke="#f0b88a" strokeWidth="1" transform="rotate(20, 50, 12)" />
                  {/* Inner ear */}
                  <ellipse cx="10" cy="12" rx="4" ry="5" fill="#f8bbd0" transform="rotate(-20, 10, 12)" />
                  <ellipse cx="50" cy="12" rx="4" ry="5" fill="#f8bbd0" transform="rotate(20, 50, 12)" />
                  {/* Eyes */}
                  {petState === "happy" ? (
                    <>
                      <path d="M19 26 Q22 22 25 26" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                      <path d="M35 26 Q38 22 41 26" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                    </>
                  ) : petState === "hungry" ? (
                    <>
                      <circle cx="22" cy="26" r="2.5" fill="#555" />
                      <circle cx="38" cy="26" r="2.5" fill="#555" />
                    </>
                  ) : (
                    <>
                      <circle cx="22" cy="26" r="3" fill="#333" />
                      <circle cx="38" cy="26" r="3" fill="#333" />
                      <circle cx="23" cy="25" r="1" fill="white" />
                      <circle cx="39" cy="25" r="1" fill="white" />
                    </>
                  )}
                  {/* Blush */}
                  <ellipse cx="14" cy="34" rx="5" ry="3" fill={blushColor} />
                  <ellipse cx="46" cy="34" rx="5" ry="3" fill={blushColor} />
                  {/* Mouth */}
                  {petState === "happy" ? (
                    <path d="M24 37 Q30 43 36 37" fill="none" stroke="#e57373" strokeWidth="2" strokeLinecap="round" />
                  ) : petState === "hungry" ? (
                    <path d="M24 39 Q30 36 36 39" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
                  ) : petState === "sad" ? (
                    <path d="M26 40 Q30 37 34 40" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" />
                  ) : (
                    <path d="M24 38 Q30 42 36 38" fill="none" stroke="#e57373" strokeWidth="1.5" strokeLinecap="round" />
                  )}
                  {/* Whiskers */}
                  <line x1="8" y1="30" x2="16" y2="32" stroke="#ddd" strokeWidth="0.8" />
                  <line x1="8" y1="34" x2="16" y2="34" stroke="#ddd" strokeWidth="0.8" />
                  <line x1="52" y1="30" x2="44" y2="32" stroke="#ddd" strokeWidth="0.8" />
                  <line x1="52" y1="34" x2="44" y2="34" stroke="#ddd" strokeWidth="0.8" />
                </svg>
              </div>
              {/* Hearts burst */}
              {hearts.map((h) => (
                <span key={h} className="absolute inset-0 flex items-center justify-center text-lg animate-heart-burst pointer-events-none">
                  ❤️💕
                </span>
              ))}
            </div>
            <p className="text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender">
              {pet?.pet_name ?? "Mochi"}
            </p>
            {focusTimer.mode === "focus" && (
              <p className="text-[10px] text-kawaii-pink mt-1 animate-pulse">🛡️ Guarding your focus!</p>
            )}
          </div>

          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-xs">
              <span>🍽️</span>
              <div className="flex-1 h-2 bg-slate-200 dark:bg-dark-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-kawaii-coral to-kawaii-pink transition-all duration-500" style={{ width: `${pet?.hunger ?? 0}%` }} />
              </div>
              <span className="font-medium text-slate-500">{pet?.hunger ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span>💖</span>
              <div className="flex-1 h-2 bg-slate-200 dark:bg-dark-surface rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-500" style={{ width: `${pet?.happiness ?? 0}%` }} />
              </div>
              <span className="font-medium text-slate-500">{pet?.happiness ?? 0}</span>
            </div>
          </div>

          <div className="flex gap-2 mb-2">
            <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => doAction("feed")}>
              🍣 Feed
            </Button>
            <Button size="sm" variant="outline" className="text-xs flex-1" onClick={burstHearts}>
              🎾 Pet
            </Button>
          </div>

          <Dialog open={gamesOpen} onOpenChange={(open) => { setGamesOpen(open); if (!open) handleGamesClose(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="primary" className="text-xs w-full">
                🎮 Games
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[360px] border-2 border-kawaii-lavender/40">
              <DialogHeader>
                <DialogTitle className="text-center">🎮 Mini Games</DialogTitle>
              </DialogHeader>
              <MiniGamesDialog onGameEnd={handleGameEnd} />
            </DialogContent>
          </Dialog>

          {message && (
            <p className="text-center text-xs text-kawaii-purple mt-2 font-medium animate-fade-in">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

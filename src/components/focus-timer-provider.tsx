"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

interface FocusTimerContextType {
  mode: "idle" | "focus" | "break" | "paused";
  timeRemaining: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  focusDuration: number;
  breakDuration: number;
  setFocusDuration: (d: number) => void;
  setBreakDuration: (d: number) => void;
}

const FocusTimerContext = createContext<FocusTimerContextType>(null!);

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function notify(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body });
  }
  playBeep();
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"idle" | "focus" | "break" | "paused">("idle");
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const modeRef = useRef(mode);
  const pausedFrom = useRef<"focus" | "break">("focus");

  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("focusTimer");
      if (saved) {
        const parsed = JSON.parse(saved);
        setMode(parsed.mode || "idle");
        setTimeRemaining(parsed.timeRemaining ?? 25 * 60);
        setFocusDuration(parsed.focusDuration ?? 25 * 60);
        setBreakDuration(parsed.breakDuration ?? 5 * 60);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("focusTimer", JSON.stringify({ mode, timeRemaining, focusDuration, breakDuration }));
    } catch {}
  }, [mode, timeRemaining, focusDuration, breakDuration]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const start = useCallback(() => {
    setMode("focus");
    setTimeRemaining(focusDuration);
  }, [focusDuration]);

  const pause = useCallback(() => {
    clearTimer();
    pausedFrom.current = modeRef.current === "break" ? "break" : "focus";
    setMode("paused");
  }, [clearTimer]);

  const resume = useCallback(() => {
    setMode(pausedFrom.current);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setMode("idle");
    setTimeRemaining(focusDuration);
  }, [clearTimer, focusDuration]);

  useEffect(() => {
    if (mode === "idle" || mode === "paused") {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          if (modeRef.current === "focus") {
            setMode("break");
            setTimeRemaining(breakDuration);
            notify("🍅 Focus Complete!", "Time for a break! 5 minutes rest.");
          } else {
            setMode("idle");
            setTimeRemaining(focusDuration);
            notify("☕ Break Over!", "Ready to focus again?");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [mode, focusDuration, breakDuration, clearTimer]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <FocusTimerContext.Provider
      value={{
        mode,
        timeRemaining,
        isRunning: mode === "focus" || mode === "break",
        start,
        pause,
        resume,
        reset,
        focusDuration,
        breakDuration,
        setFocusDuration,
        setBreakDuration,
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer(): FocusTimerContextType {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) throw new Error("useFocusTimer must be used within FocusTimerProvider");
  return ctx;
}

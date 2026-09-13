// Tiny pub/sub store for Mochi's mood so the lesson player can react and the
// floating Mochi component can listen.
"use client";

export type MochiMood = "neutral" | "happy" | "sad" | "excited" | "thinking" | "sleeping";

let mood: MochiMood = "neutral";
let moodAt = Date.now();
const listeners = new Set<(m: MochiMood) => void>();

export function mochiMood(): MochiMood {
  return mood;
}

export function mochiReact(m: MochiMood) {
  mood = m;
  moodAt = Date.now();
  listeners.forEach((l) => l(m));
}

export function subscribeMochi(fn: (m: MochiMood) => void): () => void {
  listeners.add(fn);
  fn(mood);
  return () => {
    listeners.delete(fn);
  };
}

// React with a mood, then auto-revert to neutral after a delay.
let revertTimer: ReturnType<typeof setTimeout> | null = null;
export function mochiReactAuto(m: MochiMood, revertMs = 2000) {
  mochiReact(m);
  if (revertTimer) clearTimeout(revertTimer);
  revertTimer = setTimeout(() => mochiReact("neutral"), revertMs);
}

// Inactivity-based moods: thinking after 10s, sleeping after 60s, unless the
// user reacted recently. Returns the effective mood for a timestamp.
export function mochiEffective(now: number): MochiMood {
  const idle = now - moodAt;
  if (mood === "thinking" || mood === "sleeping") return mood;
  if (idle > 60_000) return "sleeping";
  if (idle > 10_000) return "thinking";
  return mood;
}
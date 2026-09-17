// Global sound + haptic settings (persisted), a playSound() helper using
// howler, and a React hook for the HUD toggles. Client-only usage.
"use client";

import { useState, useEffect, useCallback } from "react";

export interface SoundSettings {
  sound: boolean;
  haptic: boolean;
}

const KEY = "sari-sound-settings";

let settings: SoundSettings = { sound: true, haptic: true };
let listeners = new Set<() => void>();

function persist() {
  try {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}

export function getSoundSettings(): SoundSettings {
  return settings;
}

export function setSoundSettings(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  persist();
  listeners.forEach((l) => l());
}

export function toggleSound() {
  setSoundSettings({ sound: !settings.sound });
}
export function toggleHaptic() {
  setSoundSettings({ haptic: !settings.haptic });
}

export function subscribeSoundSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ── playback ──────────────────────────────────────────────────
const SOUND_NAMES = ["correct", "wrong", "complete", "streak", "levelup", "heartloss", "tap", "xp-tick", "node-complete", "freeze", "gong", "choir", "chime", "whoosh", "coin", "pop", "bell", "fanfare"];
const howlCache = new Map<string, any>();

async function ensureHowls(): Promise<boolean> {
  try {
    const { Howl } = await import("howler");
    for (const n of SOUND_NAMES) {
      if (!howlCache.has(n)) howlCache.set(n, new Howl({ src: [`/sounds/${n}.wav`], volume: 0.85 }));
    }
    return true;
  } catch {
    return false;
  }
}

export function playSound(name: string) {
  if (typeof window === "undefined") return;
  if (!settings.sound) return;
  const h = howlCache.get(name);
  if (h) {
    try {
      h.play();
    } catch {
      // ignore
    }
    return;
  }
  // not primed yet — load lazily
  ensureHowls()
    .then((ok) => {
      if (ok) howlCache.get(name)?.play();
    })
    .catch(() => {});
}

// iOS/Safari keeps the AudioContext suspended until a user gesture. Preload
// every sound and play a (near-silent) tap inside the FIRST gesture so audio
// unlocks on iPhone/iPad — later plays then run synchronously.
let unlockRegistered = false;
let primed = false;

export function registerAudioUnlock() {
  if (typeof window === "undefined" || unlockRegistered) return;
  unlockRegistered = true;
  const unlock = () => {
    if (primed) return;
    primed = true;
    ensureHowls().then(async () => {
      try {
        const { Howler } = await import("howler");
        const ctx = Howler?.ctx;
        if (ctx && typeof ctx.resume === "function" && ctx.state === "suspended") ctx.resume().catch(() => {});
        const tap = howlCache.get("tap");
        if (tap) {
          tap.volume(0.0001);
          tap.play();
          tap.volume(0.85);
        }
      } catch {}
    });
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

// ── React hook ────────────────────────────────────────────────
export function useSoundSettings() {
  const [, force] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) settings = { ...settings, ...JSON.parse(raw) };
    } catch {}
    const unsub = subscribeSoundSettings(() => force((x) => x + 1));
    return unsub;
  }, []);
  const set = useCallback((next: Partial<SoundSettings>) => setSoundSettings(next), []);
  return { settings, set, toggleSound, toggleHaptic } as const;
}
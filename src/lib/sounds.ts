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
const howlCache = new Map<string, any>();

async function getHowl(name: string): Promise<any> {
  if (howlCache.has(name)) return howlCache.get(name);
  const { Howl } = await import("howler");
  const h = new Howl({ src: [`/sounds/${name}.wav`], volume: 0.85 });
  howlCache.set(name, h);
  return h;
}

export function playSound(name: string) {
  if (typeof window === "undefined") return;
  if (!settings.sound) return;
  getHowl(name)
    .then((h) => h.play())
    .catch(() => {});
}

// iOS/Safari keeps the AudioContext suspended until a user gesture — resume it
// on the first interaction so sounds unlock on iPhone/iPad.
let unlockRegistered = false;
function resumeContext() {
  import("howler")
    .then((mod) => {
      const Howler = (mod as any).Howler;
      const ctx = Howler?.ctx;
      if (ctx && typeof ctx.resume === "function" && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    })
    .catch(() => {});
}

export function registerAudioUnlock() {
  if (typeof window === "undefined" || unlockRegistered) return;
  unlockRegistered = true;
  const unlock = () => {
    resumeContext();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
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
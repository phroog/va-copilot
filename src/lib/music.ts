"use client";

// Lightweight synthesized ambient pad for lessons and the client sim.
// No audio files, no loops — a few soft oscillators on Howler's AudioContext
// that fade in/out so it can't stutter or bug. Respects the sound toggle.

import { getSoundSettings, subscribeSoundSettings } from "@/lib/sounds";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voices: { osc: OscillatorNode; gain: GainNode }[] = [];
let lfo: OscillatorNode | null = null;
let running = false;
let muted = false;
let vol = 0.05;

async function ensure(): Promise<boolean> {
  if (ctx && master) return true;
  try {
    const { Howler } = await import("howler");
    const c = Howler.ctx as AudioContext | undefined;
    if (!c) return false;
    ctx = c;
    master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    return true;
  } catch {
    return false;
  }
}

function addVoice(freq: number, type: OscillatorType, detune = 0, amp = 1) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const g = ctx.createGain();
  g.gain.value = 0;
  osc.connect(g);
  g.connect(master);
  g.gain.linearRampToValueAtTime(amp, ctx.currentTime + 2.5);
  osc.start();
  voices.push({ osc, gain: g });
}

function fadeTarget(v: number, secs: number) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const g = master.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(v, t + secs);
}

export async function startMusic(situation: "lesson" | "sim"): Promise<void> {
  if (running) return;
  if (!getSoundSettings().sound) return;
  if (!(await ensure())) return;
  running = true;
  vol = situation === "sim" ? 0.05 : 0.04;

  // Two chords: lesson = bright/motivating, sim = slightly tense.
  const chord =
    situation === "sim"
      ? [220, 261.63, 329.63, 440] // A3 C#4 E4 A4 (A major, upbeat grind)
      : [220, 261.63, 311.13, 440]; // A3 C#4 D#4 A4 (A add4 — inspiring)
  for (const f of chord) {
    addVoice(f, "sine", (Math.random() * 6 - 3), 0.22);
    addVoice(f * 2, "sine", (Math.random() * 6 - 3), 0.06);
  }
  addVoice(chord[0] * 0.5, "triangle", 0, 0.18); // sub root

  // Slow "breathing" LFO so it feels alive, not static.
  if (ctx && master) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 0.008;
    lfo.connect(lg);
    lg.connect(master.gain);
    lfo.start();
  }

  fadeTarget(muted ? 0 : vol, 3);
}

export function stopMusic(): void {
  if (!running) return;
  running = false;
  fadeTarget(0, 1.2);
  const t = (ctx?.currentTime ?? 0) + 1.4;
  for (const v of voices) {
    try {
      v.gain.gain.linearRampToValueAtTime(0, t - 0.05);
      v.osc.stop(t + 0.1);
      v.gain.disconnect();
    } catch {}
  }
  if (lfo) {
    try {
      lfo.stop(t);
    } catch {}
  }
  voices = [];
  lfo = null;
}

// Keep in sync with the global sound toggle.
if (typeof window !== "undefined") {
  subscribeSoundSettings(() => {
    muted = !getSoundSettings().sound;
    if (running) fadeTarget(muted ? 0 : vol, 0.4);
  });
}
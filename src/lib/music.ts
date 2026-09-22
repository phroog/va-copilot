"use client";

// Synthesized music engine — no audio files, no external loops. Plays real
// melodic progressions via Web Audio on Howler's AudioContext: a soft pad +
// a bell melody per situation (map / lesson / sim), plus one-shot cues
// (rising "final push" tone near a level's end, victory jingle). Everything
// fades in/out and respects the sound toggle, so it can't stutter or bug.

import { getSoundSettings, subscribeSoundSettings } from "@/lib/sounds";

export type Situation = "map" | "lesson" | "sim";

// Background music master switch (persisted separately from sound effects).
export function isMusicEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem("sari_bgmusic") !== "0";
  } catch {
    return true;
  }
}

interface Bar {
  pad: string[];
  melody: (string | null)[];
}

interface Pattern {
  bpm: number;
  bars: Bar[];
}

const NOTE_SEMIS: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

function noteToFreq(note: string): number {
  const m = note.match(/^([A-G]#?)(\d)$/);
  if (!m) return 440;
  const semis = NOTE_SEMIS[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (semis - 69) / 12);
}

// ── Patterns ────────────────────────────────────────────────────────
const PATTERNS: Record<Situation, Pattern> = {
  // Calm map theme (C major: C – Am – F – G), sparse and gentle.
  map: {
    bpm: 88,
    bars: [
      { pad: ["C3", "E3", "G3"], melody: [null, "E4", null, "G4", null, null, "C5", null] },
      { pad: ["A2", "C3", "E3"], melody: [null, "C4", null, "E4", null, null, "A4", null] },
      { pad: ["F2", "A2", "C3"], melody: [null, "A3", null, "C4", null, null, "F4", null] },
      { pad: ["G2", "B2", "D3"], melody: [null, "B3", null, "D4", null, null, "G4", null] },
    ],
  },
  // Uplifting mission theme (A major: A – E – F#m – D).
  lesson: {
    bpm: 100,
    bars: [
      { pad: ["A2", "C#3", "E3"], melody: ["A3", null, "C#4", "E4", null, "A4", "E4", null] },
      { pad: ["E2", "G#2", "B2"], melody: ["E3", null, "G#3", "B3", null, "E4", "B3", null] },
      { pad: ["F#2", "A2", "C#3"], melody: ["F#3", null, "A3", "C#4", null, "F#4", "C#4", null] },
      { pad: ["D2", "F#2", "A2"], melody: ["D3", null, "F#3", "A3", null, "D4", "A3", null] },
    ],
  },
  // Driven client-sim theme (A minor: Am – F – C – G), a little more energy.
  sim: {
    bpm: 116,
    bars: [
      { pad: ["A2", "C3", "E3"], melody: [null, "A3", "E4", null, "A4", null, "E4", "C4"] },
      { pad: ["F2", "A2", "C3"], melody: [null, "F3", "C4", null, "F4", null, "C4", "A3"] },
      { pad: ["C3", "E3", "G3"], melody: [null, "G3", "E4", null, "C5", null, "E4", "G3"] },
      { pad: ["G2", "B2", "D3"], melody: [null, "B3", "D4", null, "G4", null, "D4", "B3"] },
    ],
  },
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: Situation | null = null;
let running = false;
let muted = false;
let vol = 0.05;

let scheduler: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let step = 0;
let barCount = 4;
let eighth = 0.3;

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

function padChord(notes: string[], at: number) {
  if (!ctx || !master) return;
  for (const n of notes) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = noteToFreq(n);
    const g = ctx.createGain();
    const start = at;
    const dur = eighth * 8 + 0.6;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.05, start + 0.8);
    g.gain.setValueAtTime(0.05, start + dur - 1.2);
    g.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.1);
  }
}

function melodyNote(note: string, at: number) {
  if (!ctx || !master || !note) return;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = noteToFreq(note);
  const g = ctx.createGain();
  const dur = eighth * 1.6;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.035, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function scheduleStep(i: number, at: number) {
  const pattern = current ? PATTERNS[current] : PATTERNS.lesson;
  const barIdx = Math.floor(i / 8) % barCount;
  const stepInBar = i % 8;
  const bar = pattern.bars[barIdx];
  if (stepInBar === 0) padChord(bar.pad, at);
  const m = bar.melody[stepInBar];
  if (m) melodyNote(m, at);
}

function startScheduler() {
  if (!ctx || !current) return;
  const pattern = PATTERNS[current];
  barCount = pattern.bars.length;
  eighth = 60 / pattern.bpm / 2;
  step = 0;
  nextTime = ctx.currentTime + 0.12;
  scheduler = setInterval(() => {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.3) {
      scheduleStep(step, nextTime);
      nextTime += eighth;
      step = (step + 1) % (barCount * 8);
    }
  }, 90);
}

function stopScheduler() {
  if (scheduler) {
    clearInterval(scheduler);
    scheduler = null;
  }
}

function fadeTarget(v: number, secs: number) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const g = master.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(v, t + secs);
}

export async function startMusic(situation: Situation): Promise<void> {
  if (!isMusicEnabled()) return;
  if (!getSoundSettings().sound) return;
  if (current === situation && running) return;
  stopMusic();
  if (!(await ensure())) return;
  current = situation;
  running = true;
  vol = situation === "sim" ? 0.05 : 0.045;
  startScheduler();
  fadeTarget(muted ? 0 : vol, 3);
}

export function stopMusic(): void {
  if (!running && !current) return;
  running = false;
  current = null;
  stopScheduler();
  fadeTarget(0, 1.1);
}

// ── One-shot cues ────────────────────────────────────────────────────
function arpeggio(notes: string[], stepSec: number, type: OscillatorType, amp: number) {
  const c = ctx;
  const m = master;
  if (!c || !m || !getSoundSettings().sound) return;
  const t0 = c.currentTime + 0.02;
  notes.forEach((n, i) => {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = noteToFreq(n);
    const g = c.createGain();
    const t = t0 + i * stepSec;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + stepSec * 3);
    osc.connect(g);
    g.connect(m);
    osc.start(t);
    osc.stop(t + stepSec * 3.2);
  });
}

// Rising "final push" tone when the player reaches the top of a level.
export function playRisingCue(): void {
  void ensure().then(() => {
    arpeggio(["A4", "C#5", "E5", "A5"], 0.11, "triangle", 0.05);
  });
}

// Bright victory jingle for perfect runs / rank-ups.
export function playVictoryJingle(): void {
  void ensure().then(() => {
    arpeggio(["C5", "E5", "G5", "C6", "G5", "C6"], 0.09, "triangle", 0.06);
  });
}

// Keep in sync with the global sound toggle.
if (typeof window !== "undefined") {
  subscribeSoundSettings(() => {
    muted = !getSoundSettings().sound;
    if (running) fadeTarget(muted ? 0 : vol, 0.4);
  });
}
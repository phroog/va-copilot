// Confetti bursts via canvas-confetti. Client-only.
"use client";

import confetti from "canvas-confetti";

const COLORS = ["#a560f0", "#ff8ba7", "#58cc02", "#ffc800", "#1cb0f6"];

export function smallBurst(x: number, y: number) {
  confetti({
    particleCount: 28,
    spread: 55,
    startVelocity: 24,
    gravity: 0.9,
    ticks: 60,
    origin: { x, y },
    colors: COLORS,
    disableForReducedMotion: true,
  });
}

export function burstConfetti() {
  confetti({ particleCount: 130, spread: 110, origin: { y: 0.65 }, colors: COLORS, disableForReducedMotion: true });
  setTimeout(() => {
    confetti({ particleCount: 70, angle: 60, spread: 70, origin: { x: 0 }, colors: COLORS, disableForReducedMotion: true });
    confetti({ particleCount: 70, angle: 120, spread: 70, origin: { x: 1 }, colors: COLORS, disableForReducedMotion: true });
  }, 250);
}

export function celebrationConfetti() {
  const end = Date.now() + 1200;
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: COLORS, disableForReducedMotion: true });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: COLORS, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
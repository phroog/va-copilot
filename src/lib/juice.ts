// Central "juice" helpers: sounds + haptics + Mochi reactions for the
// lesson player and path. Client-only.
"use client";

import { playSound } from "@/lib/sounds";
import { haptic, HAPTIC } from "@/lib/haptics";
import { burstConfetti, celebrationConfetti } from "@/lib/confetti";
import { mochiReactAuto } from "@/lib/mochi";

export function answerJuice(correct: boolean) {
  if (correct) {
    playSound("correct");
    haptic(HAPTIC.CORRECT);
    mochiReactAuto("happy", 1600);
  } else {
    playSound("wrong");
    playSound("heartloss");
    haptic(HAPTIC.WRONG);
    mochiReactAuto("sad", 2400);
  }
}

export function finishJuice() {
  burstConfetti();
  playSound("complete");
  playSound("chime");
  haptic(HAPTIC.COMPLETE);
  mochiReactAuto("excited", 3200);
}

export function nodeCompleteJuice() {
  playSound("gong");
  playSound("node-complete");
  haptic(HAPTIC.NODE);
  mochiReactAuto("excited", 2600);
}

export function levelUpJuice() {
  playSound("choir");
  playSound("fanfare");
  celebrationConfetti();
  mochiReactAuto("excited", 3500);
}

export function claimJuice() {
  playSound("coin");
  haptic(HAPTIC.TAP);
}
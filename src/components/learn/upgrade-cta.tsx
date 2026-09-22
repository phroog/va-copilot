"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Fair, plan-aware upgrade prompts — persuasive but honest. Copy rotates so
// the same message never gets stale.

const FREE_LINES = [
  { title: "1 lesson a day is just a taste", sub: "BLOOM unlocks 2 lessons/day + the Client Sim grind + a live, shareable badge." },
  { title: "Your badge is sleeping on Free", sub: "BLOOM wakes it up — sealed skills, scout pool, and a link you can put in your bio." },
  { title: "Free = 1 mission. BLOOM = more.", sub: "Double the lessons, the Client Sim, and your badge goes live. From $4.99, pay once." },
];

const PRO_LINES = [
  { title: "BLOOM is great. Money Club is how you get seen", sub: "Unlimited lessons, unlimited Client Sim, top scout pool, verified badge, 1:1 support." },
  { title: "Why stop at 2 lessons?", sub: "Money Club = unlimited training + unlimited grind mode. Pay once, no subscription." },
  { title: "The Top Scout Pool is a Money Club perk", sub: "Partner agencies see verified badges first. Go unlimited, get seen." },
];

function dayPick(list: { title: string; sub: string }[]): { title: string; sub: string } {
  const day = Math.floor(Date.now() / 86_400_000);
  return list[day % list.length];
}

export function UpgradeCta({ plan, compact = false }: { plan: string; compact?: boolean }) {
  // No prompt for Money Club users.
  if (plan === "pro") return null;

  const isBasic = plan === "basic";
  const line = isBasic ? dayPick(PRO_LINES) : dayPick(FREE_LINES);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-dl-gold/40 bg-gradient-to-r from-dl-gold/15 via-dl-purple/10 to-kawaii-pink/10 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-white">{line.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/60">{line.sub}</p>
        </div>
        {!compact && (
          <span className="shrink-0 text-2xl">{isBasic ? "👑" : "🌸"}</span>
        )}
      </div>
      <Link
        href="/pricing"
        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dl-green text-white text-[13px] font-extrabold shadow-btn-green hover:brightness-105 active:translate-y-0.5 transition-all squishy"
      >
        {isBasic ? "Go Money Club" : "Go BLOOM"} →
      </Link>
    </motion.div>
  );
}
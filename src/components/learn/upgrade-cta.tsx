"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Fair, plan-aware upgrade prompts — persuasive but honest. Copy rotates so
// the same message never gets stale.

const FREE_LINES = [
  { title: "Agencies can't scout what they can't see", sub: "Free profiles stay out of the scout pool. BLOOM puts your badge where partner agencies actually look." },
  { title: "Don't give up — your shot is one step away", sub: "Partner agencies are reviewing profiles right now. BLOOM gets you into the pool and your badge goes live." },
  { title: "Dream big? Then give your badge a chance", sub: "One prepaid top-up puts you in the Scout Pool. From $4.99, pay once — no subscription." },
];

const PRO_LINES = [
  { title: "The agencies are looking right now", sub: "Money Club puts you at the front of the line: Top Scout Pool, verified badge, unlimited training to finish the job." },
  { title: "This is the dream — don't stop halfway", sub: "Unlimited lessons + unlimited Client Sim + Top Scout Pool. That's how you get hired." },
  { title: "Be the one they scout", sub: "Partner agencies see Top Scout Pool profiles first. Go unlimited." },
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
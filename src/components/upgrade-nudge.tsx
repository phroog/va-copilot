"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { UPGRADE_SLOGANS } from "@/lib/upgrade-slogans";

/* Floating corner nudge that pushes an upgrade with rotating, slightly
   provocative slogans.
   - Sari Sprout (free)  → always visible (no dismiss), slogan rotates.
   - Sari Bloom (basic)  → shows occasionally, dismissible (snoozes it).
   - Sari Money Club     → never shown.
   Always nudges toward the Money Club. */

export default function UpgradeNudge() {
  const [plan, setPlan] = useState<string | null>(null);
  const [snoozed, setSnoozed] = useState(false);
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * UPGRADE_SLOGANS.length));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/subscription-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d) setPlan(d.plan ?? "free"); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (plan !== "free" && plan !== "basic") return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % UPGRADE_SLOGANS.length);
    }, 8000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [plan]);

  if (plan !== "free" && plan !== "basic") return null;
  if (plan === "basic" && snoozed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-[260px] animate-fade-in">
      <Link
        href="/pricing"
        className="group flex items-start gap-2 rounded-2xl border border-kawaii-purple/40 bg-white/95 dark:bg-dark-card/95 shadow-sari px-3 py-2.5 backdrop-blur hover:border-kawaii-purple/70 transition-colors"
      >
        <span className="text-lg leading-none mt-0.5">👑</span>
        <span className="text-xs font-semibold leading-snug text-slate-700 dark:text-slate-200">
          {UPGRADE_SLOGANS[idx]}
          <span className="block text-[10px] font-bold text-kawaii-purple dark:text-kawaii-lavender mt-0.5">
            Join the Money Club →
          </span>
        </span>
      </Link>
      {plan === "basic" && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSnoozed(true); }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-200 dark:bg-dark-surface text-slate-500 dark:text-slate-300 text-[10px] leading-none hover:bg-slate-300 dark:hover:bg-dark-surface/80"
          aria-label="Dismiss"
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

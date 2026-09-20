"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const NUDGES = [
  { href: "/learn", text: "⚡ One quick mission keeps your momentum going." },
  { href: "/learn", text: "🔥 Your streak is watching. 3 minutes is all it takes." },
  { href: "/learn/leaderboard", text: "🏆 The bots are grinding — don't fall behind!" },
  { href: "/learn", text: "💬 Client Sim is open — easy XP while it's quiet." },
  { href: "/badge", text: "🏅 One more sealed skill makes your badge pop." },
];

const VISIBLE_MS = 7500;
const MIN_GAP = 3.5 * 60_000;
const MAX_GAP = 8 * 60_000;

interface Nudge {
  href: string;
  text: string;
  id: number;
}

// A gentle, transient nudge that appears randomly during a session and fades
// away — it comes and goes, never stays. Skips lessons.
export function ReminderToast() {
  const pathname = usePathname();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    let gapTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    let progress: ReturnType<typeof setInterval>;
    let startAt = 0;

    const clearAll = () => {
      clearTimeout(gapTimer);
      clearTimeout(hideTimer);
      clearInterval(progress);
    };

    const show = () => {
      // Don't nag mid-lesson or when the tab is hidden.
      if (document.hidden || pathname.startsWith("/learn/play")) {
        gapTimer = setTimeout(show, 90_000);
        return;
      }
      const n = NUDGES[Math.floor(Math.random() * NUDGES.length)];
      startAt = Date.now();
      setNudge({ ...n, id: Date.now() });
      progress = setInterval(() => setLeft(Math.min(1, (Date.now() - startAt) / VISIBLE_MS)), 100);
      hideTimer = setTimeout(() => {
        setNudge(null);
        clearInterval(progress);
        setLeft(0);
        gapTimer = setTimeout(show, MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP));
      }, VISIBLE_MS);
    };

    gapTimer = setTimeout(show, 45_000);
    return clearAll;
  }, [pathname]);

  const R = 15;
  const C = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {nudge && (
        <motion.div
          key={nudge.id}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[75]"
        >
          <Link
            href={nudge.href}
            onClick={() => setNudge(null)}
            className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-full bg-[#1f2233] border border-white/10 shadow-2xl hover:border-kawaii-purple/60 transition-colors"
          >
            <span className="text-[13px] font-bold text-white/90 whitespace-nowrap">{nudge.text}</span>
            <span className="relative w-8 h-8 shrink-0">
              <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
                <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r={R}
                  fill="none"
                  stroke="#a560f0"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - left)}
                />
              </svg>
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
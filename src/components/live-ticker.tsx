"use client";

import { useState, useEffect } from "react";

/* Live purchase ticker — small rotating "just joined" notifications with
   realistic Filipino names. Feels alive, builds social proof + urgency. */

const EVENTS = [
  { name: "Maria Santos", city: "Manila", plan: "Bloom", emoji: "🌸" },
  { name: "Paolo Garcia", city: "Makati", plan: "Money Club", emoji: "👑" },
  { name: "Angela Cruz", city: "Cebu", plan: "Bloom", emoji: "🌸" },
  { name: "Grace Dela Cruz", city: "Davao", plan: "Bloom", emoji: "🌸" },
  { name: "Kyla Mendoza", city: "Bulacan", plan: "Money Club", emoji: "👑" },
  { name: "John Paul Reyes", city: "Quezon City", plan: "Bloom", emoji: "🌸" },
  { name: "Camille Flores", city: "Iloilo", plan: "Money Club", emoji: "👑" },
  { name: "Ramon Villanueva", city: "Pampanga", plan: "Bloom", emoji: "🌸" },
];

const MINUTES_AGO = ["just now", "1 min ago", "2 mins ago", "3 mins ago", "5 mins ago"];

export default function LiveTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let i = 0;
    setIdx(0);
    setVisible(true);
    const show = () => {
      setVisible(false);
      setTimeout(() => {
        i = (i + 1) % EVENTS.length;
        setIdx(i);
        setVisible(true);
      }, 600);
    };
    const interval = setInterval(show, 5000);
    return () => clearInterval(interval);
  }, []);

  const e = EVENTS[idx];

  return (
    <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
      <div
        className={`flex items-center gap-3 rounded-2xl bg-white/95 dark:bg-dark-card/95 border border-kawaii-lavender/40 dark:border-dark-surface shadow-sari px-4 py-3 transition-all duration-500 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-white text-xs font-bold shrink-0">
          {e.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            {e.emoji} {e.name} from {e.city} joined Sari {e.plan}
          </p>
          <p className="text-[10px] text-slate-400">{MINUTES_AGO[idx % MINUTES_AGO.length]}</p>
        </div>
      </div>
    </div>
  );
}
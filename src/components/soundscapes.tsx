"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/context";

const SOUNDS = [
  { id: "lofi", label: "Lo-Fi Beats", emoji: "🎵", videoId: "jfKfPfyJRdk" },
  { id: "rain", label: "Rain Sounds", emoji: "🌧️", videoId: "mPZkdNFkNps" },
  { id: "coffee", label: "Coffee Shop", emoji: "☕", videoId: "VMAPTo7RQCo" },
  { id: "nature", label: "Nature Sounds", emoji: "🌿", videoId: "nDq6T2Ei2Ac" },
];

export default function Soundscapes() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-transform squishy"
        title={t("sounds")}
      >
        🎵
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 bg-white dark:bg-dark-card rounded-3xl shadow-2xl p-4 w-72 border border-kawaii-lavender/30 dark:border-dark-surface animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-sm">🎵 {t("sounds")}</h3>
            <button
              onClick={() => { setOpen(false); setActive(null); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 squishy"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {SOUNDS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(active === s.id ? null : s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm font-medium transition-all squishy ${
                  active === s.id
                    ? "bg-kawaii-lavender/40 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender"
                    : "text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20 dark:hover:bg-dark-surface/50"
                }`}
              >
                <span>{s.emoji}</span>
                <span className="flex-1 text-left">{s.label}</span>
                {active === s.id ? <span className="text-xs">⏹</span> : <span className="text-xs">▶</span>}
              </button>
            ))}
          </div>
          {active && (
            <div className="mt-3 rounded-2xl overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${SOUNDS.find((s) => s.id === active)?.videoId}?autoplay=1&loop=1&playlist=${SOUNDS.find((s) => s.id === active)?.videoId}`}
                className="w-full h-40"
                allow="autoplay"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

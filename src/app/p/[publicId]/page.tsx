"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TIER_META: Record<string, { label: string; emoji: string }> = {
  platinum: { label: "Platinum", emoji: "💎" },
  gold: { label: "Gold", emoji: "🥇" },
  silver: { label: "Silver", emoji: "🥈" },
  bronze: { label: "Bronze", emoji: "🥉" },
};

interface PublicBadge {
  name: string;
  publicId: string;
  xp: number;
  level: number;
  rankEmoji: string;
  rankTitle: string;
  streak: number;
  overall: { pct: number; mastered: number; total: number };
  specialties: { emoji: string; title: string; pct: number; sealed: boolean }[];
  stats: { lessonsDone: number; bestSpeedTier: string; bestAccuracyTier: string };
  portfolio: { activities: string[]; projects: string[] };
}

export default function PublicBadgePage({ params }: { params: { publicId: string } }) {
  const [data, setData] = useState<PublicBadge | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/badge/${encodeURIComponent(params.publicId)}`);
        if (!res.ok) {
          setState("missing");
          return;
        }
        const d = await res.json();
        setData(d);
        setState("ok");
      } catch {
        setState("missing");
      }
    })();
  }, [params.publicId]);

  if (state === "missing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-4">😢</div>
        <h1 className="text-2xl font-extrabold text-white">This profile doesn't exist</h1>
        <p className="mt-2 text-white/50 text-sm max-w-xs">The badge link may be wrong, or the profile was removed.</p>
        <Link href="/" className="mt-6 px-6 py-3 rounded-2xl bg-dl-green text-white font-extrabold shadow-btn-green hover:brightness-105 transition-all">
          Back to Sari
        </Link>
      </div>
    );
  }

  if (state === "loading" || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 animate-pulse">Loading profile…</p>
      </div>
    );
  }

  const st = TIER_META[data.stats.bestSpeedTier] ?? TIER_META.bronze;
  const at = TIER_META[data.stats.bestAccuracyTier] ?? TIER_META.bronze;
  const ringR = 42;
  const ringC = 2 * Math.PI * ringR;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="py-10 px-4 max-w-[480px] mx-auto">
      {/* certificate card */}
      <div className="relative rounded-3xl p-6 border-2 border-dl-gold/40 bg-gradient-to-b from-[#2a2d3f] to-[#1f2233] shadow-[0_0_60px_rgba(255,200,0,0.08)]">
        <div className="absolute inset-2.5 rounded-2xl border border-dashed border-dl-gold/30 pointer-events-none" />

        <div className="relative flex justify-center -mt-3 mb-4">
          <div className="relative px-8 py-2 bg-dl-gold rounded-b-xl shadow-btn-gold">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#854c00] text-center leading-tight">
              Sari · VA
              <br />
              Verified Profile
            </p>
          </div>
          <span className="absolute -left-1 top-0 h-3 w-3 bg-dl-gold rotate-45" style={{ transformOrigin: "top left" }} />
        </div>

        <div className="relative text-center">
          <div className="text-4xl mb-1">{data.rankEmoji}</div>
          <p className="text-2xl font-extrabold text-white leading-tight">{data.name}</p>
          <p className="text-[13px] text-white/60">{data.rankTitle} · Level {data.level}</p>
          {data.streak > 0 && <p className="text-[11px] font-bold text-dl-orange mt-1">🔥 {data.streak}-day streak</p>}
        </div>

        {/* specialties */}
        {data.specialties.length > 0 && (
          <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
            {data.specialties.map((s) => (
              <span
                key={s.title}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border",
                  s.sealed ? "bg-dl-gold/15 border-dl-gold/40 text-dl-gold" : "bg-white/5 border-white/10 text-white/70"
                )}
              >
                {s.emoji} {s.title}
                {s.sealed && " ✓"}
              </span>
            ))}
          </div>
        )}

        {/* mastery ring */}
        <div className="relative flex items-center justify-center my-5">
          <svg width={120} height={120} className="-rotate-90">
            <circle cx={60} cy={60} r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
            <circle
              cx={60}
              cy={60}
              r={ringR}
              fill="none"
              stroke="#58cc02"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${ringC * data.overall.pct} ${ringC}`}
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-extrabold text-white leading-none">{Math.round(data.overall.pct * 100)}%</p>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/40">mastered</p>
          </div>
        </div>

        {/* performance */}
        <div className="relative grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">Speed</p>
            <p className="text-lg font-extrabold text-white">{st.emoji} {st.label}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">Accuracy</p>
            <p className="text-lg font-extrabold text-white">{at.emoji} {at.label}</p>
          </div>
        </div>
        <p className="relative mt-3 text-center text-[11px] font-bold text-white/50">
          {data.stats.lessonsDone} missions completed
        </p>

        {/* portfolio */}
        {(data.portfolio.activities.length > 0 || data.portfolio.projects.length > 0) && (
          <div className="relative mt-4 space-y-3">
            {data.portfolio.activities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {data.portfolio.activities.map((a) => (
                  <span key={a} className="px-2.5 py-1 rounded-full bg-kawaii-purple/15 border border-kawaii-purple/40 text-[11px] font-bold text-white/90">
                    {a}
                  </span>
                ))}
              </div>
            )}
            {data.portfolio.projects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {data.portfolio.projects.map((p) => (
                  <span key={p} className="px-2.5 py-1 rounded-full bg-dl-green/15 border border-dl-green/40 text-[11px] font-bold text-white/90">
                    📁 {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* footer */}
        <div className="relative mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-white/35">
          <span>Verified on Sari</span>
          <span className="text-dl-gold/70">ID {data.publicId.slice(0, 10)}</span>
        </div>
      </div>

      <p className="text-center text-[11px] text-white/40 mt-5">
        Made with <Link href="/" className="text-dl-purpleLight font-bold hover:underline">Sari 🍠</Link> — your VA training dojo
      </p>
    </motion.div>
  );
}
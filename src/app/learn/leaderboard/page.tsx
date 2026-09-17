"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  isBot: boolean;
  isYou: boolean;
  isNew?: boolean;
}

interface LeaderboardData {
  entries: Entry[];
  user: { name: string; rank: number; level: number; rankEmoji: string; rankTitle: string; xp: number };
  totalPlayers: number;
}

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/learn/leaderboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <span className="text-white/40 animate-pulse">Loading ranks…</span>
      </div>
    );
  }
  if (!data) return null;

  const podium = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);
  const medal = ["🥇", "🥈", "🥉"];
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="py-8 px-4 max-w-[560px] mx-auto">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-3xl font-extrabold text-white">The Ranks</h1>
        <p className="mt-2 text-[15px] text-white/60">
          Climb the board. Top VAs get reviewed by real agencies every month.
        </p>
      </div>

      {/* user rank card */}
      <div className="rounded-2xl bg-[#1f2233] border border-white/10 p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-dl-purple to-[#ff8ba7] flex items-center justify-center text-2xl">
            {data.user.rankEmoji}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-white">{data.user.name}</p>
            <p className="text-xs text-white/50">{data.user.rankTitle} · Level {data.user.level}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-dl-purpleLight leading-none">#{data.user.rank}</p>
            <p className="text-[10px] text-white/40">of {Math.max(data.totalPlayers + 40, 100)}</p>
          </div>
        </div>
      </div>

      {/* podium */}
      <div className="grid grid-cols-3 gap-3 items-end mb-6">
        {podiumOrder.map((e, i) => {
          if (!e) return <div key={i} />;
          const rank = data.entries.indexOf(e) + 1;
          return (
            <div key={e.id} className={cn("text-center", rank === 1 && "order-2")}>
              <div className="text-3xl mb-1">{medal[rank - 1]}</div>
              <div
                className={cn(
                  "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl",
                  e.isYou ? "bg-gradient-to-br from-dl-purple to-[#ff8ba7]" : "bg-[#1f2233] border border-white/10"
                )}
              >
                {e.avatar}
              </div>
              <p className="text-xs font-extrabold text-white mt-1 truncate">
                {e.name} {e.isNew && <span className="text-[9px] text-dl-blue align-middle">NEW</span>}
              </p>
              <p className="text-[11px] font-bold text-dl-purpleLight">{e.xp} XP</p>
            </div>
          );
        })}
      </div>

      {/* rest */}
      <div className="space-y-2">
        {rest.map((e) => {
          const rank = data.entries.indexOf(e) + 1;
          return (
            <div
              key={e.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border",
                e.isYou ? "border-dl-purple bg-dl-purple/15" : "border-white/10 bg-[#1f2233]"
              )}
            >
              <span className="w-6 text-center text-sm font-extrabold text-white/40">{rank}</span>
              <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">
                {e.avatar}
              </span>
              <span className="flex-1 font-bold text-white/90 truncate">
                {e.name}
                {e.isBot && <span className="ml-1 text-[10px] text-white/30 font-semibold">🤖</span>}
                {e.isNew && <span className="ml-1 text-[9px] font-extrabold text-dl-blue bg-dl-blue/15 px-1.5 py-0.5 rounded-full">NEW</span>}
                {e.isYou && <span className="ml-1 text-[10px] font-extrabold text-dl-purpleLight">YOU</span>}
              </span>
              <span className="text-sm font-extrabold text-dl-purpleLight">{e.xp} XP</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
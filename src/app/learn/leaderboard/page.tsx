"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RankHud, type HudUser } from "@/components/learn/rank-hud";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  isBot: boolean;
  isYou: boolean;
}

interface LeaderboardData {
  entries: Entry[];
  user: HudUser & { name: string; rank: number };
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
        <p className="text-slate-400 animate-pulse">Loading ranks…</p>
      </div>
    );
  }

  if (!data) return null;

  const podium = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);
  const medal = ["🥇", "🥈", "🥉"];
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="py-8 px-2">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">The Ranks</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Climb the board. Top VAs get reviewed by real agencies every month — and maybe recruited.
        </p>
      </div>

      {/* User rank card */}
      <div className="max-w-md mx-auto mb-6">
        <RankHud user={data.user} />
        <p className="text-center mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          You are <span className="text-kawaii-purple dark:text-kawaii-lavender">#{data.user.rank}</span> out of {Math.max(data.totalPlayers + 40, 100)} players
        </p>
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-6 items-end">
        {podiumOrder.map((e, i) => {
          if (!e) return <div key={i} />;
          const rank = data.entries.indexOf(e) + 1;
          return (
            <div key={e.id} className={cn("text-center", rank === 1 && "order-2")}>
              <div className="text-3xl mb-1">{medal[rank - 1]}</div>
              <div className={cn("w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br", e.isYou ? "from-kawaii-purple to-kawaii-pink" : "from-kawaii-lavender/50 to-kawaii-pink/40 dark:from-dark-surface dark:to-dark-surface", e.isBot && "opacity-90")}>
                {e.avatar}
              </div>
              <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1 truncate">{e.name}</p>
              <p className="text-[11px] font-bold text-kawaii-purple dark:text-kawaii-lavender">{e.xp} XP</p>
            </div>
          );
        })}
      </div>

      {/* Rest of the board */}
      <div className="max-w-lg mx-auto space-y-2">
        {rest.map((e) => {
          const rank = data.entries.indexOf(e) + 1;
          return (
            <div
              key={e.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border",
                e.isYou
                  ? "border-kawaii-purple bg-kawaii-lavender/20 dark:bg-dark-surface"
                  : "border-kawaii-lavender/20 dark:border-dark-surface bg-white/60 dark:bg-dark-card/60"
              )}
            >
              <span className="w-6 text-center text-sm font-extrabold text-slate-400">{rank}</span>
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-kawaii-lavender/40 to-kawaii-pink/30 dark:from-dark-surface dark:to-dark-surface flex items-center justify-center text-lg">
                {e.avatar}
              </span>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 truncate">
                {e.name}
                {e.isBot && <span className="ml-1 text-[10px] text-slate-400 font-semibold">🤖</span>}
                {e.isYou && <span className="ml-1 text-[10px] font-extrabold text-kawaii-purple">YOU</span>}
              </span>
              <span className="text-sm font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{e.xp} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

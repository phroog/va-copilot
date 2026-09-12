"use client";

import { Card, CardContent } from "@/components/ui/card";

export interface HudUser {
  xp: number;
  level: number;
  rankTitle: string;
  rankEmoji: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  nextRankTitle: string | null;
  nextRankEmoji: string | null;
  xpToNextRank: number | null;
  streak: number;
}

export function RankHud({ user, compact = false }: { user: HudUser; compact?: boolean }) {
  const levelPct = Math.min(100, Math.round((user.xpIntoLevel / user.xpForNextLevel) * 100));

  return (
    <Card className="border-kawaii-lavender/40 dark:border-dark-surface bg-white/80 dark:bg-dark-card/80 shadow-sari-sm">
      <CardContent className={compact ? "p-4" : "p-5"}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-3xl shrink-0 shadow-sari-sm">
            {user.rankEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{user.rankTitle}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender">
                  Level {user.level}
                </span>
              </div>
              {user.streak > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-kawaii-coral">
                  🔥 {user.streak}
                </span>
              )}
            </div>

            <div className="mt-2 h-3 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-500"
                style={{ width: `${levelPct}%` }}
              />
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>{user.xpIntoLevel}/{user.xpForNextLevel} XP</span>
              {user.nextRankTitle && (
                <span className="truncate ml-2">
                  {user.nextRankEmoji} {user.nextRankTitle} in {user.xpToNextRank} XP
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

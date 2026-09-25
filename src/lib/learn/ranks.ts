// Rank tiers + XP→level curve. XP is the single source of truth; the
// "Level" number and the rank title are both derived from total XP.
import type { RankTier } from "./types";

// Global XP economy scale — makes the leaderboard look like months of grinding.
export const XP_SCALE = 50;

export const RANKS: RankTier[] = [
  { title: "Rookie", emoji: "🐣", min: 0 },
  { title: "Side-Hustler", emoji: "🥔", min: 100 * XP_SCALE },
  { title: "Rising VA", emoji: "🌱", min: 300 * XP_SCALE },
  { title: "Client Magnet", emoji: "🧲", min: 800 * XP_SCALE },
  { title: "Six-Figure Freelancer", emoji: "💎", min: 1800 * XP_SCALE },
  { title: "VA Elite", emoji: "👑", min: 4000 * XP_SCALE },
  { title: "Agency-Bait", emoji: "🏆", min: 8000 * XP_SCALE },
];

// XP needed to advance one level number. Early levels are quick (dopamine),
// later levels get harder so users are never satisfied.
export function xpForLevel(level: number): number {
  return (100 + (level - 1) * 25) * XP_SCALE;
}

export function levelFromXp(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let remaining = xp;
  let level = 1;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: xpForLevel(level) };
}

export function rankFromXp(xp: number): RankTier {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.min) current = r;
  }
  return current;
}

export function nextRank(xp: number): RankTier | null {
  for (const r of RANKS) {
    if (xp < r.min) return r;
  }
  return null;
}

export function summarizeXp(xp: number) {
  const { level, xpIntoLevel, xpForNextLevel } = levelFromXp(xp);
  const rank = rankFromXp(xp);
  const next = nextRank(xp);
  return {
    xp,
    level,
    rankTitle: rank.title,
    rankEmoji: rank.emoji,
    xpIntoLevel,
    xpForNextLevel,
    nextRankTitle: next?.title ?? null,
    nextRankEmoji: next?.emoji ?? null,
    xpToNextRank: next ? next.min - xp : null,
  };
}

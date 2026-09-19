// Performance tiers shared by the lesson player, complete route and badge.
// Speed is measured as timeTaken / targetTime (ratio < 1 = faster than expected).
// Accuracy is a 0..1 fraction of correct answers.

export type PerfTier = "bronze" | "silver" | "gold" | "platinum";

export interface TierDef {
  key: PerfTier;
  label: string;
  emoji: string;
  min: number;
}

export const SPEED_TIERS: TierDef[] = [
  { key: "platinum", label: "Platinum", emoji: "💎", min: 0.5 },
  { key: "gold", label: "Gold", emoji: "🥇", min: 0.75 },
  { key: "silver", label: "Silver", emoji: "🥈", min: 1 },
  { key: "bronze", label: "Bronze", emoji: "🥉", min: Infinity },
];

export const ACCURACY_TIERS: TierDef[] = [
  { key: "platinum", label: "Platinum", emoji: "💎", min: 0.95 },
  { key: "gold", label: "Gold", emoji: "🥇", min: 0.85 },
  { key: "silver", label: "Silver", emoji: "🥈", min: 0.7 },
  { key: "bronze", label: "Bronze", emoji: "🥉", min: 0 },
];

// Speed bonus XP: faster runs earn a bigger chunk of the base reward.
export const SPEED_BONUS_PCT: Record<PerfTier, number> = {
  platinum: 0.3,
  gold: 0.2,
  silver: 0.1,
  bronze: 0,
};

export function speedTier(ratio: number): TierDef {
  for (const t of SPEED_TIERS) if (ratio < t.min) return t;
  return SPEED_TIERS[SPEED_TIERS.length - 1];
}

export function accuracyTier(accuracy: number): TierDef {
  for (const t of ACCURACY_TIERS) if (accuracy >= t.min) return t;
  return ACCURACY_TIERS[ACCURACY_TIERS.length - 1];
}

export function speedBonusXp(xpReward: number, ratio: number): number {
  return Math.round(xpReward * SPEED_BONUS_PCT[speedTier(ratio).key]);
}

export function speedRatio(timeSeconds: number, targetSeconds: number): number {
  if (!timeSeconds || timeSeconds <= 0 || !targetSeconds || targetSeconds <= 0) return 1.5;
  return timeSeconds / targetSeconds;
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
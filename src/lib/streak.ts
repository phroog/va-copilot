/* Dream Streak — daily activity streak with milestone rewards.
   The end goal ("the dream") at 90 days is 1 month of Money Club free. */

export interface StreakMilestone {
  days: number;
  credits?: number;
  freeMonth?: boolean;
  label: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, credits: 5, label: "+5 credits" },
  { days: 30, credits: 25, label: "+25 credits · Streak Hero badge" },
  { days: 60, credits: 50, label: "+50 credits · exclusive feature" },
  { days: 90, freeMonth: true, label: "1 month of Money Club free" },
];

export function currentMilestone(streak: number): StreakMilestone | null {
  let current: StreakMilestone | null = null;
  for (const m of STREAK_MILESTONES) {
    if (streak >= m.days) current = m;
  }
  return current;
}

export function nextMilestone(streak: number): StreakMilestone | null {
  for (const m of STREAK_MILESTONES) {
    if (streak < m.days) return m;
  }
  return null;
}

export function claimedSet(claimed: unknown): Set<string> {
  return new Set(Array.isArray(claimed) ? claimed.map((c: any) => String(c?.days ?? c)) : []);
}
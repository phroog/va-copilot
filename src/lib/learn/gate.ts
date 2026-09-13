// Freemium gating for the path. The first FREE_LEVELS skills in the linear
// path order are free (the whole base course); the advanced progression
// tiers after that require a paid plan. Mirrors the existing plan system so
// the same subscription unlocks the whole product.
import { effectivePlan, type PlanKey } from "@/lib/payments";

// First ~9 skills (one section / the base course) are free.
export const FREE_LEVELS = 9;

export interface SubLike {
  plan?: string | null;
  status?: string | null;
  access_until?: string | null;
}

export function isPaidUser(sub: SubLike | null | undefined): boolean {
  return effectivePlan(sub) !== "free";
}

// Sorted nodes by (depth, order_index) → the unlock order within a path.
export function sortNodes<T extends { depth: number; order_index: number }>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => (a.depth - b.depth) || (a.order_index - b.order_index));
}

// Given a node's position in the linear path, is it behind the paywall?
export function nodeRequiresPaid(pathIndex: number): boolean {
  return pathIndex >= FREE_LEVELS;
}

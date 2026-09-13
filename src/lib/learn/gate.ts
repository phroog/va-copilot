// Freemium gating for the skill tree. Depth 0 (root) and depth 1 (first
// branches) are free; everything deeper requires a paid plan (the paywall).
// Depth-based so it works for any per-user tree structure. Mirrors the
// existing plan system so the same subscription unlocks the whole product.
import { effectivePlan, type PlanKey } from "@/lib/payments";

// Depth 0 + 1 are free; depth >= 2 is paid.
export const FREE_MAX_DEPTH = 1;

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

// Given a node's depth in the user's tree, is it behind the paywall?
export function nodeRequiresPaid(depth: number): boolean {
  return depth > FREE_MAX_DEPTH;
}

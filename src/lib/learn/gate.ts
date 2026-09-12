// Freemium gating for the skill tree. The first FREE_NODES_PER_PATH nodes of a
// path are free; everything deeper requires a paid plan (the paywall). Mirrors
// the existing plan system so the same subscription unlocks the whole product.
import { effectivePlan, type PlanKey } from "@/lib/payments";

// First 3 nodes (root + both depth-1 branches) are free per path.
export const FREE_NODES_PER_PATH = 3;

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

// Given the unlock order (sorted nodes), returns true if the node at that index
// is behind the paywall.
export function nodeRequiresPaid(sortedIndex: number): boolean {
  return sortedIndex >= FREE_NODES_PER_PATH;
}

// Deterministic per-user skill tree generation. Seeded by user_id + path_id,
// so every user's tree is unique (a "fingerprint") but stable across reloads.
// Each user gets a different branch structure → the tree grows differently
// for everyone, and its size/shape is something to show off.
import type { SkillNode } from "./types";

export interface TreeEntry {
  node_id: string;
  parent_id: string | null;
  depth: number;
  order_index: number;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a unique tree from a path's skill pool. Structure varies per seed:
 * - the root is random, branches get random widths and random parents,
 * - every branch keeps at least one child so the tree always fills upward.
 */
export function generateTree(nodes: SkillNode[], seed: string): TreeEntry[] {
  const rand = mulberry32(hashStr(seed));
  const shuffled = shuffle(nodes, rand);
  const [root, ...rest] = shuffled;
  const total = rest.length;
  if (!root) return [];

  // Branch widths vary by seed.
  let d1 = 2 + Math.floor(rand() * 2); // 2-3
  let d2 = 2 + Math.floor(rand() * 2); // 2-3
  let d3 = total - d1 - d2;
  if (d3 < 1) {
    d2 = Math.max(1, total - d1 - 1);
    d3 = total - d1 - d2;
    if (d3 < 1) {
      d1 = Math.max(1, total - 2);
      d2 = Math.max(1, total - d1 - 1);
      d3 = total - d1 - d2;
    }
  }

  const depth1 = rest.slice(0, d1);
  const depth2 = rest.slice(d1, d1 + d2);
  const depth3 = rest.slice(d1 + d2);

  const entries: TreeEntry[] = [{ node_id: root.id, parent_id: null, depth: 0, order_index: 1 }];
  depth1.forEach((n, i) => entries.push({ node_id: n.id, parent_id: root.id, depth: 1, order_index: i + 1 }));
  // Round-robin so every depth-1 branch gets at least one child.
  depth2.forEach((n, i) => entries.push({ node_id: n.id, parent_id: depth1[i % depth1.length].id, depth: 2, order_index: i + 1 }));
  depth3.forEach((n, i) => entries.push({ node_id: n.id, parent_id: depth2[i % depth2.length].id, depth: 3, order_index: i + 1 }));

  return entries;
}

// A short human-friendly id for a tree's unique structure (for flexing).
export function fingerprintId(nodes: { id: string; parent_id: string | null }[]): string {
  const sorted = [...nodes].sort((a, b) => (a.id < b.id ? -1 : 1));
  const sig = sorted.map((n) => `${n.id.slice(0, 6)}:${n.parent_id?.slice(0, 6) ?? "R"}`).join("|");
  const h = hashStr(sig);
  return "TR-" + h.toString(36).toUpperCase().slice(0, 4);
}
// Shared bottom-up tree layout: root at the bottom, leaves at the top.
// x = midpoint of a subtree's leaf span → a proper tree shape that looks
// different for every user's unique tree structure.
import type { NodeWithStatus } from "./types";

export const H_SPACING = 250;
export const V_SPACING = 280;
export const PAD = 220;

export interface TreeLayout {
  pos: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
  maxDepth: number;
}

export function computeLayout(nodes: NodeWithStatus[]): TreeLayout {
  const children = new Map<string, string[]>();
  nodes.forEach((n) => {
    if (n.parent_id) {
      if (!children.has(n.parent_id)) children.set(n.parent_id, []);
      children.get(n.parent_id)!.push(n.id);
    }
  });
  const roots = nodes.filter((n) => !n.parent_id).sort((a, b) => a.depth - b.depth || a.order_index - b.order_index);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const leafCount = new Map<string, number>();
  const count = (id: string): number => {
    const kids = children.get(id) || [];
    if (kids.length === 0) {
      leafCount.set(id, 1);
      return 1;
    }
    const s = kids.reduce((acc, k) => acc + count(k), 0);
    leafCount.set(id, s);
    return s;
  };
  roots.forEach((r) => count(r.id));

  const col = new Map<string, number>();
  let counter = 0;
  const assign = (id: string) => {
    const kids = (children.get(id) || []).slice().sort((a, b) => byId.get(a)!.order_index - byId.get(b)!.order_index);
    if (kids.length === 0) {
      col.set(id, counter++);
      return;
    }
    kids.forEach(assign);
    const cols = kids.map((k) => col.get(k)!);
    col.set(id, (Math.min(...cols) + Math.max(...cols)) / 2);
  };
  roots.forEach((r) => assign(r.id));

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n) => {
    pos.set(n.id, {
      x: PAD + col.get(n.id)! * H_SPACING,
      y: PAD + (maxDepth - n.depth) * V_SPACING,
    });
  });

  const width = PAD * 2 + Math.max(1, counter - 1) * H_SPACING;
  const height = PAD * 2 + maxDepth * V_SPACING + 120;
  return { pos, width, height, maxDepth };
}
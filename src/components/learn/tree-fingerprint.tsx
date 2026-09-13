"use client";

import { useMemo } from "react";
import type { NodeWithStatus } from "@/lib/learn/types";
import { computeLayout } from "@/lib/learn/tree-layout";

const DOT_COLOR: Record<string, string> = {
  completed: "#7BC99B",
  available: "#B39DDB",
  locked: "rgba(179,157,219,0.35)",
};

// A tiny silhouette of the user's unique tree — their "fingerprint".
export function TreeFingerprint({ nodes, size = 72 }: { nodes: NodeWithStatus[]; size?: number }) {
  const layout = useMemo(() => computeLayout(nodes), [nodes]);
  const s = Math.min(size / layout.width, size / layout.height);
  const w = layout.width * s;
  const h = layout.height * s;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} className="select-none">
      {nodes.map((n) => {
        if (!n.parent_id) return null;
        const p = layout.pos.get(n.parent_id);
        const c = layout.pos.get(n.id);
        if (!p || !c) return null;
        return (
          <line
            key={`${n.parent_id}-${n.id}`}
            x1={p.x * s}
            y1={p.y * s}
            x2={c.x * s}
            y2={c.y * s}
            stroke="rgba(179,157,219,0.5)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
      {nodes.map((n) => {
        const p = layout.pos.get(n.id);
        if (!p) return null;
        return (
          <circle
            key={n.id}
            cx={p.x * s}
            cy={p.y * s}
            r={n.status === "completed" ? 3.4 : 2.6}
            fill={DOT_COLOR[n.status]}
          />
        );
      })}
    </svg>
  );
}
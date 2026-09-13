"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Check, Play, Crown, Plus, Minus, Maximize2 } from "lucide-react";
import type { NodeWithStatus } from "@/lib/learn/types";
import { computeLayout } from "@/lib/learn/tree-layout";
import { cn } from "@/lib/utils";

const NODE_D = 56;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.2;

const LINE_COLOR: Record<string, string> = {
  completed: "#7BC99B",
  available: "#B39DDB",
  locked: "rgba(179,157,219,0.25)",
};

function NodeKnot({
  node,
  x,
  y,
}: {
  node: NodeWithStatus;
  x: number;
  y: number;
}) {
  const { status } = node;
  const level = node.levels[0];
  const href = level ? `/learn/play/${level.id}` : "#";
  const clickable = (status === "available" || status === "completed") && !!level;

  const ring =
    status === "completed"
      ? "bg-gradient-to-br from-kawaii-mint to-emerald-400 text-white border-white/70 shadow-lg shadow-emerald-500/30"
      : status === "available"
      ? "bg-gradient-to-br from-kawaii-purple to-kawaii-pink text-white border-white/80 shadow-lg shadow-kawaii-purple/40 animate-glow-pulse"
      : node.requiresPaid
      ? "bg-slate-200 dark:bg-dark-surface text-slate-400 border-kawaii-coral/30"
      : "bg-kawaii-lavender/30 dark:bg-dark-surface text-slate-400 border-kawaii-lavender/20";

  const badge =
    status === "completed" ? (
      <Check className="w-5 h-5" />
    ) : status === "available" ? (
      <Play className="w-5 h-5 ml-0.5" />
    ) : node.requiresPaid ? (
      <Crown className="w-4 h-4" />
    ) : (
      <Lock className="w-4 h-4" />
    );

  const content = (
    <>
      <button
        disabled={!clickable}
        title={
          status === "locked"
            ? node.requiresPaid
              ? "Unlock with Sari Money Club"
              : "Complete the previous skill first"
            : node.title
        }
        className={cn(
          "relative w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl select-none transition-all",
          ring,
          clickable && "cursor-pointer group-hover:scale-110"
        )}
        style={{ transform: "translate(-50%, -50%)" }}
      >
        {status === "completed" ? badge : node.emoji}
        {status === "available" && (
          <span
            className="absolute -inset-1.5 rounded-full border-2 border-kawaii-purple/30 animate-ping"
            style={{ animationDuration: "2.5s" }}
          />
        )}
        {node.requiresPaid && status !== "completed" && (
          <span className="absolute -top-2 -right-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-kawaii-coral to-kawaii-pink text-white shadow">
            PRO
          </span>
        )}
      </button>
      <span className="absolute left-1/2 top-[34px] -translate-x-1/2 w-[96px] text-center text-[11px] leading-tight font-bold text-slate-500 dark:text-slate-400">
        {node.title}
      </span>
    </>
  );

  const anchor = { position: "absolute" as const, left: x, top: y };

  if (clickable) {
    return (
      <Link href={href} style={anchor} className="group block">
        {content}
      </Link>
    );
  }
  return (
    <div style={anchor} className="group block">
      {content}
    </div>
  );
}

export function SkillTreeCanvas({ path }: { path: { nodes: NodeWithStatus[] } }) {
  const layout = useMemo(() => computeLayout(path.nodes), [path.nodes]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [ready, setReady] = useState(false);

  const fitScale = () => {
    const el = scrollRef.current;
    if (!el) return;
    const s = Math.min(el.clientWidth / layout.width, el.clientHeight / layout.height) * 0.9;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
  };

  // Fit to view on mount / path change.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const s = fitScale();
    if (s) {
      setScale(s);
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
        el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
      });
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // Mouse drag to pan (touch uses native scrolling).
  const drag = useRef<{ sx: number; sy: number; sl: number; st: number; on: boolean }>({ sx: 0, sy: 0, sl: 0, st: 0, on: false });

  const zoomAt = (factor: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cx = (el.clientWidth / 2 + el.scrollLeft) / scale;
    const cy = (el.clientHeight / 2 + el.scrollTop) / scale;
    setScale((s) => {
      const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s * factor));
      requestAnimationFrame(() => {
        el.scrollLeft = cx * ns - el.clientWidth / 2;
        el.scrollTop = cy * ns - el.clientHeight / 2;
      });
      return ns;
    });
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-[#F3EEFF] dark:bg-dark-card/60 border border-kawaii-lavender/30 dark:border-dark-surface h-[74vh] touch-pan-x touch-pan-y select-none">
      {/* faint grid to give the "world" feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(108,78,143,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") return;
          const el = scrollRef.current;
          if (!el) return;
          drag.current = { sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop, on: true };
          el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current.on || e.pointerType !== "mouse") return;
          const el = scrollRef.current;
          if (!el) return;
          el.scrollLeft = drag.current.sl - (e.clientX - drag.current.sx);
          el.scrollTop = drag.current.st - (e.clientY - drag.current.sy);
        }}
        onPointerUp={(e) => {
          drag.current.on = false;
          if (e.pointerType === "mouse") scrollRef.current?.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => (drag.current.on = false)}
      >
        <div className="relative" style={{ width: layout.width * scale, height: layout.height * scale }}>
          <div
            className="relative"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {/* connectors */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
            >
              {path.nodes.map((node) => {
                if (!node.parent_id) return null;
                const p = layout.pos.get(node.parent_id);
                const c = layout.pos.get(node.id);
                if (!p || !c) return null;
                return (
                  <line
                    key={`${node.parent_id}-${node.id}`}
                    x1={p.x}
                    y1={p.y}
                    x2={c.x}
                    y2={c.y}
                    stroke={LINE_COLOR[node.status]}
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {path.nodes.map((node) => {
              const pos = layout.pos.get(node.id);
              if (!pos) return null;
              return <NodeKnot key={node.id} node={node} x={pos.x} y={pos.y} />;
            })}
          </div>
        </div>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => zoomAt(1.25)}
          className="w-10 h-10 rounded-full bg-white/90 dark:bg-dark-card text-kawaii-purple dark:text-kawaii-lavender shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => zoomAt(0.8)}
          className="w-10 h-10 rounded-full bg-white/90 dark:bg-dark-card text-kawaii-purple dark:text-kawaii-lavender shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setScale(fitScale() ?? 0.5);
            const el = scrollRef.current;
            if (el) {
              requestAnimationFrame(() => {
                el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
                el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
              });
            }
          }}
          className="w-10 h-10 rounded-full bg-white/90 dark:bg-dark-card text-kawaii-purple dark:text-kawaii-lavender shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* hint */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/80 dark:bg-dark-card/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 shadow backdrop-blur-sm">
        Drag to explore · grow up the tree 🌱
      </div>
    </div>
  );
}
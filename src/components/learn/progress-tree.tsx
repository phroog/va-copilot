"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { PathWithNodes, NodeWithStatus } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

const H = 190;
const V = 170;
const PAD = 90;
const GOLD = "#F5C451";
const AMBER = "#E8A33D";

function layoutNodes(nodes: NodeWithStatus[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  nodes.forEach((n) => {
    if (n.parent_id) {
      if (!children.has(n.parent_id)) children.set(n.parent_id, []);
      children.get(n.parent_id)!.push(n.id);
    }
  });
  const roots = nodes.filter((n) => !n.parent_id).sort((a, b) => a.depth - b.depth || a.order_index - b.order_index);

  const col = new Map<string, number>();
  let counter = 0;
  const assign = (id: string) => {
    const kids = (children.get(id) || []).slice().sort((a, b) => byId.get(a)!.order_index - byId.get(b)!.order_index);
    if (kids.length === 0) {
      col.set(id, counter++);
      return;
    }
    kids.forEach(assign);
    const cs = kids.map((k) => col.get(k)!);
    col.set(id, (Math.min(...cs) + Math.max(...cs)) / 2);
  };
  roots.forEach((r) => assign(r.id));

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const pos = new Map<string, { x: number; y: number }>();
  nodes.forEach((n) => {
    pos.set(n.id, { x: PAD + col.get(n.id)! * H, y: PAD + (maxDepth - n.depth) * V });
  });
  return { pos, width: PAD * 2 + Math.max(1, counter - 1) * H, height: PAD * 2 + maxDepth * V + PAD };
}

export function ProgressTree() {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/learn/tree");
        if (res.status === 401) {
          window.location.href = "/auth/login?returnUrl=/learn/tree";
          return;
        }
        const data = await res.json();
        setPaths(data.paths ?? []);
        setActivePathId(data.activePathId ?? data.paths?.[0]?.id ?? null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activePath = paths.find((p) => p.id === activePathId) ?? null;

  // Progressive reveal: a node is visible if it's the root OR its parent is mastered.
  const { visible, available, byId } = useMemo(() => {
    const nodes = activePath?.nodes ?? [];
    const map = new Map(nodes.map((n) => [n.id, n]));
    const mastered = new Set(nodes.filter((n) => n.status === "completed").map((n) => n.id));
    const vis = nodes.filter((n) => !n.parent_id || mastered.has(n.parent_id));
    const avail = vis.filter((n) => n.status === "available");
    return { visible: vis, available: avail, byId: map };
  }, [activePath]);

  const layout = useMemo(() => layoutNodes(visible), [visible]);
  const masteredCount = (activePath?.nodes ?? []).filter((n) => n.status === "completed").length;
  const totalCount = activePath?.totalNodes ?? 0;

  const select = (id: string) => {
    setActivePathId(id);
    fetch("/api/learn/select-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path_id: id }),
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Growing your map…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* path tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {paths.map((p) => (
          <button
            key={p.id}
            onClick={() => select(p.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all squishy border-2",
              p.id === activePathId
                ? "border-kawaii-purple bg-kawaii-lavender/30 text-kawaii-purple dark:text-kawaii-lavender"
                : "border-kawaii-lavender/25 dark:border-dark-surface text-slate-500 hover:border-kawaii-purple/50"
            )}
          >
            <span>{p.emoji}</span>
            {p.title}
          </button>
        ))}
      </div>

      {!activePath ? (
        <p className="text-center text-slate-400 py-10">Pick a path to start growing.</p>
      ) : (
        <>
          {/* map */}
          <div className="relative rounded-3xl overflow-auto border border-kawaii-lavender/25 dark:border-dark-surface min-h-[52vh] max-h-[64vh]"
            style={{ background: "radial-gradient(circle at 50% 45%, #3a2540 0%, #241531 60%, #160d20 100%)", scrollbarWidth: "none" }}
          >
            <div className="m-auto" style={{ width: layout.width, height: layout.height, position: "relative" }}>
              {/* threads */}
              <svg className="absolute inset-0 pointer-events-none" width={layout.width} height={layout.height}>
                {visible.map((n) => {
                  if (!n.parent_id) return null;
                  const p = layout.pos.get(n.parent_id);
                  const c = layout.pos.get(n.id);
                  if (!p || !c) return null;
                  return (
                    <line key={`${n.parent_id}-${n.id}`} x1={p.x} y1={p.y} x2={c.x} y2={c.y} stroke="rgba(245,196,81,0.35)" strokeWidth={2} strokeLinecap="round" />
                  );
                })}
              </svg>

              {visible.map((n) => {
                const p = layout.pos.get(n.id)!;
                return (
                  <NodeGlow key={n.id} node={n} x={p.x} y={p.y} />
                );
              })}
            </div>

            {/* legend hint */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 border border-amber-400/25 text-[11px] font-bold text-amber-100/80 backdrop-blur-sm whitespace-nowrap">
              {available.length > 0 ? `${available.length} step${available.length > 1 ? "s" : ""} ready — tap to play` : masteredCount === totalCount ? "Every skill mastered ✨" : "Complete a node to grow more"}
            </div>
          </div>

          {/* next steps */}
          {available.length > 0 && (
            <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-amber-300/5 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-200/70 mb-2">Play next</p>
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {available.map((n) => {
                  const level = n.levels[0];
                  if (!level) return null;
                  return (
                    <Link
                      key={n.id}
                      href={`/learn/play/${level.id}`}
                      className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-bold text-sm shadow-lg shadow-kawaii-purple/25 transition-all squishy"
                    >
                      <Play className="w-4 h-4" />
                      {n.title}
                      <span className="text-[10px] font-extrabold opacity-80">+{level.xp_reward} XP</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* progress */}
          <div className="rounded-2xl border border-kawaii-lavender/20 dark:border-dark-surface bg-white/60 dark:bg-dark-card/60 p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>Your tree · {activePath.emoji} {activePath.title}</span>
              <span>{masteredCount}/{totalCount} mastered</span>
            </div>
            <div className="h-2 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-500" style={{ width: `${totalCount ? (masteredCount / totalCount) * 100 : 0}%` }} />
            </div>
            {masteredCount === totalCount && (
              <Link href="/learn" className="inline-block mt-2 text-xs font-bold text-kawaii-purple dark:text-kawaii-lavender underline">
                Continue learning more skills →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NodeGlow({ node, x, y }: { node: NodeWithStatus; x: number; y: number }) {
  const isCenter = !node.parent_id;
  const r = isCenter ? 26 : node.status === "completed" ? 18 : 16;
  const level = node.levels[0];

  let bg = "rgba(46,30,58,0.9)";
  let border = "rgba(245,196,81,0.35)";
  let glow = "none";
  if (node.status === "completed") {
    bg = "radial-gradient(circle at 35% 30%, #FFF3C4, #F5C451 60%, #C98A22)";
    border = "#FFE9A8";
    glow = `0 0 ${isCenter ? 26 : 16}px rgba(245,196,81,0.6)`;
  } else if (node.status === "available") {
    bg = "radial-gradient(circle at 35% 30%, #FFE9A8, #E8A33D)";
    border = "#FFF3C4";
    glow = "0 0 18px rgba(232,163,61,0.85)";
  } else if (node.requiresPaid) {
    border = "rgba(194,78,58,0.6)";
    bg = "rgba(46,30,58,0.95)";
  }

  const clickable = node.status === "available" && !!level;

  const content = (
    <div className="absolute" style={{ left: x, top: y, transform: "translate(-50%,-50%)" }}>
      <button
        disabled={!clickable}
        title={node.title}
        className={cn("relative rounded-full border-2 flex items-center justify-center animate-pop-in", clickable && "cursor-pointer group-hover:scale-110")}
        style={{ width: r * 2, height: r * 2, background: bg, borderColor: border, boxShadow: glow }}
      >
        {node.status === "completed" && <span className="text-white text-sm font-extrabold">✓</span>}
        {node.status === "available" && <Play className="w-5 h-5 text-amber-950" />}
        {node.status !== "completed" && node.status !== "available" && node.requiresPaid && (
          <span className="text-[8px] font-extrabold text-rose-300">PRO</span>
        )}
        {node.status !== "completed" && node.status !== "available" && !node.requiresPaid && (
          <span className="w-2 h-2 rounded-full" style={{ background: "rgba(245,196,81,0.4)" }} />
        )}
        {node.status === "available" && (
          <span className="absolute -inset-1.5 rounded-full border-2 border-amber-300/40 animate-ping" style={{ animationDuration: "2.2s" }} />
        )}
      </button>
      <span
        className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-0.5 rounded-md text-[10px] leading-tight text-center whitespace-nowrap font-bold"
        style={{ background: "rgba(0,0,0,0.6)", color: node.status === "completed" ? "#FFE9A8" : node.status === "available" ? "#F5C451" : "rgba(245,196,81,0.6)" }}
      >
        {node.title}
      </span>
    </div>
  );

  if (clickable) {
    return (
      <Link href={`/learn/play/${level!.id}`} className="group block">
        {content}
      </Link>
    );
  }
  if (node.requiresPaid) {
    return (
      <Link href="/pricing" className="group block">
        {content}
      </Link>
    );
  }
  return content;
}
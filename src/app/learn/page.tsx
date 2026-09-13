"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { sortNodes } from "@/lib/learn/gate";
import type { PathWithNodes, NodeWithStatus } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

const NODE = 70;
const STEP = 92;
const CENTER = 240;
const OFFSET = 46;

interface PathRow {
  node: NodeWithStatus;
  index: number;
  isCurrent: boolean;
  isTrophy: boolean;
  isChest: boolean;
}

export default function LearnHome() {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/learn/tree");
      if (res.status === 401) {
        window.location.href = "/auth/login?returnUrl=/learn";
        return;
      }
      const data = await res.json();
      setPaths(data.paths ?? []);
      const active = data.activePathId ?? data.paths?.[0]?.id ?? null;
      setActivePathId(active);
      setChosen(!!data.activePathId);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const choosePath = async (pathId: string) => {
    setActivePathId(pathId);
    setChosen(true);
    try {
      await fetch("/api/learn/select-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path_id: pathId }),
      });
    } catch {
      // ignore
    }
  };

  const activePath = paths.find((p) => p.id === activePathId) ?? null;

  const rows = useMemo<PathRow[]>(() => {
    if (!activePath) return [];
    const sorted = sortNodes(activePath.nodes);
    const firstAvailable = sorted.findIndex((n) => n.status === "available");
    const n = sorted.length;
    return sorted.map((node, i) => ({
      node,
      index: i,
      isCurrent: i === firstAvailable,
      isTrophy: i === n - 1,
      isChest: i > 0 && i % 5 === 0,
    }));
  }, [activePath]);

  const containerH = rows.length * STEP + 120;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <span className="text-white/50 animate-pulse">Loading your path…</span>
      </div>
    );
  }

  // ── First visit: pick your dream ──
  if (!chosen) {
    return (
      <div className="py-10 px-4 max-w-[480px] mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-float">🍠</div>
          <h1 className="text-3xl font-extrabold text-white leading-tight">
            What do you want to <span className="text-dl-purpleLight">become</span>?
          </h1>
          <p className="mt-2 text-[15px] text-white/60">Pick your dream. Your path grows from there.</p>
        </div>
        <div className="space-y-3">
          {paths.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => choosePath(p.id)}
              className="w-full text-left rounded-2xl bg-[#1f2233] border border-white/5 p-4 flex items-center gap-4 hover:border-dl-purple/60 transition-colors"
            >
              <span className="text-3xl">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-white">{p.title}</p>
                <p className="text-sm text-white/50 truncate">{p.subtitle}</p>
              </div>
              <span className="text-dl-purpleLight font-extrabold">→</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="pb-6">
      {/* path pills */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pt-4 pb-3 max-w-[480px] mx-auto" style={{ scrollbarWidth: "none" }}>
        {paths.map((p) => (
          <button
            key={p.id}
            onClick={() => choosePath(p.id)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-2xl text-xs font-extrabold border transition-all",
              p.id === activePathId ? "bg-dl-purple text-white border-dl-purpleDark shadow-btn-purple" : "bg-[#1f2233] text-white/50 border-white/10 hover:text-white"
            )}
          >
            {p.emoji} {p.title}
          </button>
        ))}
      </div>

      {/* green progress header */}
      {activePath && (
        <div className="max-w-[480px] mx-auto px-4">
          <div
            className="rounded-t-3xl bg-dl-green px-5 py-4 flex items-center justify-between shadow-[0_4px_0_0_#46a302]"
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                Level 1 · Section 1
              </p>
              <p className="text-lg font-extrabold text-white leading-tight">{activePath.title}</p>
            </div>
            <span className="text-2xl">📋</span>
          </div>
        </div>
      )}

      {/* serpentine path */}
      <div className="relative max-w-[480px] mx-auto" style={{ height: containerH }}>
        <svg className="absolute inset-0 pointer-events-none" width={480} height={containerH}>
          {rows.slice(0, -1).map((row, i) => {
            const next = rows[i + 1];
            const x1 = CENTER + (row.index % 2 === 0 ? OFFSET : -OFFSET);
            const y1 = row.index * STEP + 40;
            const x2 = CENTER + (next.index % 2 === 0 ? OFFSET : -OFFSET);
            const y2 = next.index * STEP + 40;
            const mx = CENTER;
            const my = (y1 + y2) / 2;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={4}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {rows.map((row) => (
          <PathNode key={row.node.id} row={row} />
        ))}
      </div>

      {/* practice mastered */}
      {activePath && (() => {
        const mastered = sortNodes(activePath.nodes).filter((n) => n.status === "completed");
        if (mastered.length === 0) return null;
        return (
          <div className="max-w-[480px] mx-auto px-4 mt-2">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/40 mb-2">Mastered — practice again</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {mastered.map((n) => {
                const lvl = n.levels[0];
                if (!lvl) return null;
                return (
                  <Link key={n.id} href={`/learn/play/${lvl.id}`} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#1f2233] border border-dl-green/40 text-white/80 text-xs font-bold hover:border-dl-green transition-colors">
                    <span className="text-dl-green font-extrabold">✓</span> {n.title}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}

function PathNode({ row }: { row: PathRow }) {
  const { node, index, isCurrent, isTrophy, isChest } = row;
  const level = node.levels[0];
  const offset = index % 2 === 0 ? OFFSET : -OFFSET;
  const left = CENTER + offset;
  const top = index * STEP;
  const size = isTrophy ? 92 : NODE;
  const locked = node.status === "locked";

  const style = isCurrent
    ? "bg-dl-green shadow-node-green"
    : node.status === "completed"
    ? "bg-dl-green shadow-node-green"
    : node.status === "available"
    ? "bg-dl-purple shadow-node-purple"
    : isChest
    ? "bg-dl-gold shadow-node-gold"
    : "bg-dl-greyDark shadow-node-grey";

  const inner = (
    <div className="flex flex-col items-center" style={{ width: size + 8 }}>
      <motion.button
        animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
        transition={isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
        disabled={locked}
        title={locked ? "Locked — keep going" : node.title}
        className={cn(
          "relative rounded-full border-4 flex items-center justify-center transition-all",
          style,
          isCurrent && "border-white/30",
          locked ? "cursor-not-allowed" : "cursor-pointer hover:brightness-110"
        )}
        style={{ width: size, height: size, borderColor: isCurrent ? "rgba(255,255,255,0.35)" : undefined }}
      >
        <span
          className={cn(
            "font-extrabold leading-none",
            isTrophy ? "text-[40px]" : "text-[30px]",
            locked && "opacity-40"
          )}
        >
          {isTrophy ? "🏆" : isChest && !isCurrent ? "📦" : node.status === "completed" ? "✓" : isCurrent ? "⭐" : "☆"}
        </span>
        {isCurrent && (
          <span className="absolute -inset-2 rounded-full bg-dl-green/40 animate-ping" style={{ animationDuration: "2.2s" }} />
        )}
      </motion.button>
      <span className={cn("mt-2 text-[12px] font-bold text-center leading-tight max-w-[110px]", locked ? "text-white/30" : "text-white")}>
        {node.title}
      </span>
    </div>
  );

  if (locked) {
    return <div className="absolute" style={{ left: left - size / 2, top, transform: "translateY(0)" }}>{inner}</div>;
  }
  return (
    <Link href={level ? `/learn/play/${level.id}` : "/learn/tree"} className="absolute" style={{ left: left - size / 2, top }}>
      {inner}
    </Link>
  );
}
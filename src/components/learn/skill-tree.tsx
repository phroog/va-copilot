"use client";

import Link from "next/link";
import { Lock, Check, Play, Crown } from "lucide-react";
import type { PathWithNodes, NodeWithStatus } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

function NodeCard({ node, isFirst }: { node: NodeWithStatus; isFirst: boolean }) {
  const { status } = node;

  const level = node.levels[0];
  const href = level ? `/learn/play/${level.id}` : "#";

  const ring =
    status === "completed"
      ? "border-kawaii-mint ring-2 ring-kawaii-mint/40"
      : status === "available"
      ? "border-kawaii-purple/60 hover:border-kawaii-purple hover:shadow-sari-lg hover:-translate-y-0.5 animate-glow-pulse"
      : node.requiresPaid
      ? "border-kawaii-coral/40 opacity-80"
      : "border-kawaii-lavender/30 opacity-60";

  const body = (
    <div
      className={cn(
        "relative w-full p-4 rounded-2xl border-2 bg-white/80 dark:bg-dark-card/80 transition-all squishy",
        status === "available" ? "cursor-pointer" : "cursor-default",
        ring
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-kawaii-lavender/40 to-kawaii-pink/30 dark:from-dark-surface dark:to-dark-surface flex items-center justify-center text-xl shrink-0">
          {node.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm leading-tight">{node.title}</h4>
            {node.requiresPaid && status !== "completed" && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-kawaii-coral/15 text-kawaii-coral">
                <Crown className="w-3 h-3" /> PRO
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{node.subtitle}</p>
          <div className="mt-2 flex items-center gap-2">
            {status === "completed" ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-kawaii-mint">
                <Check className="w-4 h-4" /> Done · {node.progress?.xp_earned ?? 0} XP
              </span>
            ) : status === "available" ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-kawaii-purple dark:text-kawaii-lavender">
                <Play className="w-3.5 h-3.5" /> Play · +{node.xp_reward} XP
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Lock className="w-3.5 h-3.5" />
                {node.requiresPaid ? "Unlock with Sari Money Club" : "Complete previous skill"}
              </span>
            )}
          </div>
        </div>
      </div>

      {isFirst && status === "available" && (
        <span className="absolute -top-2 -right-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-kawaii-pink text-white shadow-sari-sm animate-bounce">
          START
        </span>
      )}
    </div>
  );

  if (status === "available" && level) {
    return (
      <Link href={href} className="block w-full">
        {body}
      </Link>
    );
  }
  return <div className="w-full">{body}</div>;
}

export function SkillTree({ path }: { path: PathWithNodes }) {
  const byDepth = (d: number) => path.nodes.filter((n) => n.depth === d);

  const renderDepth = (depth: number) => {
    const nodes = byDepth(depth);
    if (nodes.length === 0) return null;
    return (
      <div key={depth} className="flex flex-col items-center">
        <div
          className={cn(
            "grid gap-4 w-full",
            nodes.length === 1 ? "max-w-sm" : "grid-cols-1 sm:grid-cols-2 max-w-2xl"
          )}
        >
          {nodes.map((node, i) => {
            const firstAvailableIndex = path.nodes.findIndex((n) => n.status === "available");
            const isFirst = path.nodes.indexOf(node) === firstAvailableIndex && depth === 0;
            return <NodeCard key={node.id} node={node} isFirst={isFirst} />;
          })}
        </div>
        {depth < 2 && byDepth(depth + 1).length > 0 && (
          <div className="h-6 w-px bg-gradient-to-b from-kawaii-lavender/60 to-kawaii-lavender/20 my-1" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      {renderDepth(0)}
      {renderDepth(1)}
      {renderDepth(2)}
    </div>
  );
}

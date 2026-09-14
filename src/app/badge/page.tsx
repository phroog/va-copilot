"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sortNodes } from "@/lib/learn/gate";
import { fingerprintId } from "@/lib/learn/tree-gen";
import type { PathWithNodes, NodeWithStatus } from "@/lib/learn/types";
import type { HudUser } from "@/components/learn/rank-hud";
import { cn } from "@/lib/utils";

export default function BadgePage() {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [user, setUser] = useState<HudUser | null>(null);
  const [name, setName] = useState("Virtual Assistant");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/learn/tree");
        if (res.status === 401) {
          window.location.href = "/auth/login?returnUrl=/badge";
          return;
        }
        const d = await res.json();
        setPaths(d?.paths ?? []);
        setUser(d?.user ?? null);
        const p = await fetch("/api/profile").then((r) => r.json());
        if (p?.profile?.full_name) setName(p.profile.full_name);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activePath = paths.find((p) => p.id === (user as any)?.activePathId) ?? paths[0] ?? null;

  const { mastered, sorted, pct, fpId } = useMemo(() => {
    if (!activePath) return { mastered: [], sorted: [], pct: 0, fpId: "" };
    const sorted = sortNodes(activePath.nodes);
    const mastered = sorted.filter((n) => n.status === "completed");
    const pct = activePath.totalNodes ? mastered.length / activePath.totalNodes : 0;
    return { mastered, sorted, pct, fpId: fingerprintId(sorted) };
  }, [activePath]);

  const ringR = 42;
  const ringC = 2 * Math.PI * ringR;

  if (loading) {
    return (
      <div className="py-6 px-4 max-w-[480px] mx-auto space-y-4">
        <div className="h-10 w-44 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-80 rounded-3xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 px-4 max-w-[480px] mx-auto pb-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold text-white">Your Badge</h1>
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-dl-purpleLight bg-dl-purple/15 px-2 py-1 rounded-full animate-twinkle">
          <span className="w-1.5 h-1.5 rounded-full bg-dl-purpleLight" /> LIVE
        </span>
      </div>
      <p className="text-[13px] text-white/50 mb-5">A certificate that grows with every mission you master.</p>

      {/* certificate */}
      <div className="relative rounded-3xl p-6 border-2 border-dl-gold/40 bg-gradient-to-b from-[#2a2d3f] to-[#1f2233] shadow-[0_0_60px_rgba(255,200,0,0.08)]">
        {/* inner dashed frame */}
        <div className="absolute inset-2.5 rounded-2xl border border-dashed border-dl-gold/30 pointer-events-none" />

        {/* ribbons */}
        <div className="relative flex justify-center -mt-3 mb-3">
          <div className="relative px-8 py-2 bg-dl-gold rounded-b-xl shadow-btn-gold">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#854c00] text-center leading-tight">
              Sari · VA
              <br />
              Certificate
            </p>
          </div>
          <span className="absolute -left-1 top-0 h-3 w-3 bg-dl-gold rotate-45" style={{ transformOrigin: "top left" }} />
        </div>

        <div className="relative text-center">
          <div className="text-4xl mb-1">{user?.rankEmoji ?? "🏅"}</div>
          <p className="text-xl font-extrabold text-white leading-tight">{name}</p>
          <p className="text-[13px] text-white/60">{user?.rankTitle} · Level {user?.level ?? 1}</p>
          {activePath && <p className="text-[11px] font-bold text-dl-gold mt-0.5">{activePath.emoji} {activePath.title}</p>}
        </div>

        {/* mastery ring */}
        <div className="relative flex items-center justify-center my-5">
          <svg width={110} height={110} className="-rotate-90">
            <circle cx={55} cy={55} r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={9} />
            <circle
              cx={55}
              cy={55}
              r={ringR}
              fill="none"
              stroke="#58cc02"
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={`${ringC * pct} ${ringC}`}
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-extrabold text-white leading-none">{Math.round(pct * 100)}%</p>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/40">mastered</p>
          </div>
        </div>

        {/* seals */}
        <div className="relative">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-3 text-center">
            {mastered.length}/{sorted.length} skills sealed
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {sorted.map((n, i) => (
              <Seal key={n.id} node={n} index={i} />
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="relative mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-white/35">
          <span>Issued {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</span>
          <span className="text-dl-gold/70">{fpId}</span>
        </div>
      </div>

      <p className="text-center text-[11px] text-white/40 mt-4">
        Master missions to seal more skills. Watch this certificate come alive. ✨
      </p>
    </motion.div>
  );
}

function Seal({ node, index }: { node: NodeWithStatus; index: number }) {
  const done = node.status === "completed";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.05 + index * 0.015, type: "spring", stiffness: 260, damping: 16 }}
      className="flex flex-col items-center gap-1"
    >
      <span
        className={cn(
          "relative w-14 h-14 rounded-full flex items-center justify-center text-[26px] transition-all",
          done
            ? "bg-gradient-to-br from-dl-gold to-dl-goldDark text-white shadow-[0_4px_0_0_#e5a500]"
            : "bg-white/5 border-2 border-dashed border-white/15 opacity-45"
        )}
        title={node.title}
      >
        {node.emoji}
        {done && (
          <motion.span
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-dl-green text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-[#2a2d3f]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + index * 0.015, type: "spring", stiffness: 300, damping: 12 }}
          >
            ✓
          </motion.span>
        )}
      </span>
      <span className="text-[9px] font-bold text-white/70 text-center leading-tight max-w-[72px]">{node.title}</span>
    </motion.div>
  );
}
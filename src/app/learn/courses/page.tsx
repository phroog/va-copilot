"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { PathWithNodes } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

export default function CoursesPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/learn/tree")
      .then((r) => (r.status === 401 ? (window.location.href = "/auth/login?returnUrl=/learn/courses") : r.json()))
      .then((d) => {
        if (!d) return;
        setPaths(d.paths ?? []);
        setActivePathId(d.activePathId ?? d.paths?.[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = paths.find((p) => p.id === activePathId) ?? null;
  const others = useMemo(() => paths.filter((p) => p.id !== activePathId), [paths, activePathId]);

  const select = async (id: string) => {
    setSwitching(id);
    setActivePathId(id);
    try {
      await fetch("/api/learn/select-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path_id: id }),
      });
      router.push("/learn");
    } catch {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="text-white/50 animate-pulse">Loading courses…</span>
      </div>
    );
  }

  const score = active?.completedNodes ?? 0;
  const total = active?.totalNodes ?? 0;
  const pct = total ? Math.round((score / total) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-6 pb-8 max-w-[480px] mx-auto">
      <h1 className="text-2xl font-extrabold text-white mb-5">Courses</h1>

      {/* active course + add */}
      <div className="flex items-start gap-4 mb-6">
        {active && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-[88px] h-[88px] rounded-2xl bg-dl-blue/15 border-4 border-dl-blue flex items-center justify-center text-[44px] shadow-[0_4px_0_0_#1899d6]">
              {active.emoji}
            </div>
            <span className="text-sm font-extrabold text-white">{active.title}</span>
          </div>
        )}
        <div className="flex flex-col items-center gap-2">
          <div className="w-[88px] h-[88px] rounded-2xl border-2 border-dashed border-white/25 flex items-center justify-center text-3xl text-white/40">
            +
          </div>
          <span className="text-sm font-extrabold text-white/40">Course</span>
        </div>
      </div>

      {/* score card */}
      {active && (
        <div className="rounded-2xl bg-[#1f2233] border border-white/10 p-5 mb-7">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-extrabold text-white tabular-nums">{score}</span>
            <div className="relative flex-1 h-3 rounded-full bg-white/10">
              <div className="absolute inset-y-0 left-0 rounded-full bg-dl-green" style={{ width: `${pct}%` }} />
              <div
                className="absolute -top-1.5 w-6 h-6 rounded-full bg-dl-green border-4 border-[#1f2233]"
                style={{ left: `calc(${pct}% - 12px)` }}
              />
            </div>
            <span className="text-3xl font-extrabold text-white tabular-nums">{total}</span>
          </div>
          <p className="text-[15px] text-white/80">
            You mastered <b className="text-white">{score}</b> of {total} skills in {active.title}.
          </p>
          <button
            onClick={() => router.push("/learn/leaderboard")}
            className="mt-2 text-[13px] font-extrabold uppercase tracking-wide text-dl-blue"
          >
            About the Sari Score
          </button>
        </div>
      )}

      {/* new courses */}
      {others.length > 0 && (
        <>
          <h2 className="text-xl font-extrabold text-white mb-4">New courses</h2>
          <div className="grid grid-cols-3 gap-4">
            {others.map((p) => (
              <button
                key={p.id}
                onClick={() => select(p.id)}
                disabled={switching !== null}
                className="flex flex-col items-center gap-2 group"
              >
                <span className={cn("w-[76px] h-[76px] rounded-2xl bg-gradient-to-br flex items-center justify-center text-[38px] transition-transform group-hover:scale-105 shadow-[0_4px_0_0_rgba(0,0,0,0.35)]", p.color)}>
                  {p.emoji}
                </span>
                <span className="text-xs font-extrabold text-white text-center leading-tight">{p.title}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
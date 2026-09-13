"use client";

import { useEffect, useState } from "react";
import { SkillTreeCanvas } from "@/components/learn/skill-tree-canvas";
import type { PathWithNodes } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

export default function TreePage() {
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
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Growing your tree…</p>
      </div>
    );
  }

  return (
    <div className="py-5 px-3">
      <div className="text-center mb-3">
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">🌳 Skill Tree</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Drag to explore · zoom to see the whole tree</p>
      </div>

      {/* path switcher */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 -mx-3 px-3" style={{ scrollbarWidth: "none" }}>
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

      {activePath ? (
        <SkillTreeCanvas path={activePath} />
      ) : (
        <p className="text-center text-slate-400 py-10">Pick a path to see its tree.</p>
      )}
    </div>
  );
}
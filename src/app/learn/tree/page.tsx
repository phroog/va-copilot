"use client";

import { useEffect, useMemo, useState } from "react";
import { SkillTreeCanvas } from "@/components/learn/skill-tree-canvas";
import { TreeFingerprint } from "@/components/learn/tree-fingerprint";
import { fingerprintId } from "@/lib/learn/tree-gen";
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

  // A tree's "fingerprint" id — unique per user + path, computed from structure.
  const fpId = useMemo(() => (activePath ? fingerprintId(activePath.nodes) : ""), [activePath]);

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
      {/* path switcher */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 -mx-3 px-3" style={{ scrollbarWidth: "none" }}>
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

      {/* fingerprint card */}
      {activePath && (
        <div className="mb-3 rounded-3xl bg-white/80 dark:bg-dark-card/80 border border-kawaii-lavender/30 dark:border-dark-surface p-4 flex items-center gap-4">
          <div className="w-[76px] h-[76px] rounded-2xl bg-[#F3EEFF] dark:bg-dark-surface/60 flex items-center justify-center shrink-0">
            <TreeFingerprint nodes={activePath.nodes} size={64} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-kawaii-purple dark:text-kawaii-lavender">
              Your unique tree
            </p>
            <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
              {activePath.emoji} {activePath.title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fingerprint <span className="font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{fpId}</span> ·{" "}
              {activePath.totalNodes} skills · <b>{activePath.completedNodes}</b> grown
            </p>
            <div className="mt-2 h-2 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-500"
                style={{ width: `${activePath.totalNodes ? (activePath.completedNodes / activePath.totalNodes) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {activePath ? (
        <SkillTreeCanvas path={activePath} />
      ) : (
        <p className="text-center text-slate-400 py-10">Pick a path to see its tree.</p>
      )}
    </div>
  );
}
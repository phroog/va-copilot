"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PathWithNodes } from "@/lib/learn/types";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export function CourseSheet({
  open,
  onClose,
  onCourseChanged,
}: {
  open: boolean;
  onClose: () => void;
  onCourseChanged?: () => void;
}) {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/learn/tree")
      .then((r) => (r.status === 401 ? Promise.reject() : r.json()))
      .then((d) => {
        setPaths(d?.paths ?? []);
        setActivePathId(d?.activePathId ?? d?.paths?.[0]?.id ?? null);
      })
      .catch(() => {});
  }, [open]);

  const active = paths.find((p) => p.id === activePathId) ?? null;
  const others = paths.filter((p) => p.id !== activePathId);

  const select = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setActivePathId(id);
    try {
      await fetch("/api/learn/select-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path_id: id }),
      });
      playSound("chime");
      onCourseChanged?.();
      window.dispatchEvent(new CustomEvent("sari:course-changed"));
      onClose();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[480px] z-[70] bg-[#1f2233] rounded-t-3xl border-t border-x border-white/10 flex flex-col"
            style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.5)", maxHeight: "62vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            {/* drag handle */}
            <div className="pt-3 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-white/15" />
            </div>

            <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/5">
              <p className="text-lg font-extrabold text-white">Courses</p>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5">
              {/* current + add + score */}
              <div className="flex items-start gap-4">
                {active && (
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="w-[72px] h-[72px] rounded-2xl bg-dl-blue/15 border-4 border-dl-blue flex items-center justify-center text-[36px] shadow-[0_4px_0_0_#1899d6]">
                      {active.emoji}
                    </div>
                    <span className="text-[11px] font-extrabold text-white text-center leading-tight max-w-[92px]">{active.title}</span>
                  </div>
                )}
                <div className="flex flex-col items-center gap-1.5 shrink-0 opacity-45">
                  <div className="w-[72px] h-[72px] rounded-2xl border-2 border-dashed border-white/25 flex items-center justify-center text-3xl text-white/40">+</div>
                  <span className="text-[11px] font-extrabold text-white/40 text-center max-w-[92px]">Course</span>
                </div>
                {active && (
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40">Score</p>
                    <p className="text-2xl font-extrabold text-white leading-none mt-0.5">
                      {active.completedNodes}
                      <span className="text-white/40 text-base">/{active.totalNodes}</span>
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-dl-green" style={{ width: `${active.totalNodes ? (active.completedNodes / active.totalNodes) * 100 : 0}%` }} />
                    </div>
                    <p className="mt-2 text-[11px] text-white/50">Master the base course, then climb the tiers.</p>
                  </div>
                )}
              </div>

              {/* new courses */}
              {others.length > 0 && (
                <>
                  <p className="text-sm font-extrabold text-white">New courses</p>
                  <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {others.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => select(p.id)}
                        disabled={busy}
                        className="shrink-0 flex flex-col items-center gap-1.5 group"
                      >
                        <span
                          className={cn(
                            "w-[64px] h-[64px] rounded-2xl bg-gradient-to-br flex items-center justify-center text-[30px] shadow-[0_4px_0_0_rgba(0,0,0,0.35)] group-hover:scale-105 transition-transform",
                            p.color
                          )}
                        >
                          {p.emoji}
                        </span>
                        <span className="text-[10px] font-extrabold text-white text-center leading-tight max-w-[72px]">{p.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
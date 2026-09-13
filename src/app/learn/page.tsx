"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RankHud, type HudUser } from "@/components/learn/rank-hud";
import { sortNodes } from "@/lib/learn/gate";
import { fingerprintId } from "@/lib/learn/tree-gen";
import type { PathWithNodes, NodeWithStatus } from "@/lib/learn/types";
import { Check, Play, Lock, Crown, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

function PathBead({ node }: { node: NodeWithStatus }) {
  const level = node.levels[0];
  const clickable = (node.status === "available" || node.status === "completed") && !!level;
  const href = clickable && level ? `/learn/play/${level.id}` : "/learn/tree";

  return (
    <Link href={href} className="flex flex-col items-center gap-2 group">
      <span
        className={cn(
          "relative w-11 h-11 rounded-full border-2 flex items-center justify-center text-lg transition-all squishy",
          node.status === "completed" && "bg-gradient-to-br from-kawaii-mint to-emerald-400 text-white border-white/70",
          node.status === "available" && "bg-gradient-to-br from-kawaii-purple to-kawaii-pink text-white border-white/80 animate-glow-pulse group-hover:scale-110",
          node.status === "locked" && (node.requiresPaid ? "bg-slate-200 dark:bg-dark-surface text-slate-400 border-kawaii-coral/30" : "bg-kawaii-lavender/25 dark:bg-dark-surface text-slate-400 border-kawaii-lavender/20")
        )}
      >
        {node.status === "completed" ? <Check className="w-5 h-5" /> : node.status === "available" ? <Play className="w-4 h-4 ml-0.5" /> : node.emoji}
      </span>
      <span className="text-[9px] font-bold text-slate-400 max-w-[72px] text-center leading-tight">{node.title}</span>
      <span className="w-px h-4 bg-kawaii-lavender/40 dark:bg-dark-surface" />
    </Link>
  );
}

export default function LearnHome() {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [user, setUser] = useState<HudUser | null>(null);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/learn/tree");
      if (res.status === 401) {
        window.location.href = "/auth/login?returnUrl=/learn";
        return;
      }
      const data = await res.json();
      setPaths(data.paths ?? []);
      setUser(data.user ?? null);
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
    setSwitching(pathId);
    setActivePathId(pathId);
    try {
      await fetch("/api/learn/select-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path_id: pathId }),
      });
      setChosen(true);
    } catch {
      // ignore
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading your adventure…</p>
      </div>
    );
  }

  // ── First visit: pick your dream ──
  if (!chosen) {
    return (
      <div className="py-8 px-3">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 animate-float">🎮</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
            What do you want to <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">become</span>?
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Pick your dream. Your skill tree grows from there — one quick mission at a time.</p>
        </div>

        <div className="space-y-3">
          {paths.map((p, i) => (
            <button
              key={p.id}
              onClick={() => choosePath(p.id)}
              disabled={switching !== null}
              className="w-full text-left group animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <Card className="border-kawaii-lavender/30 dark:border-dark-surface bg-white/85 dark:bg-dark-card/85 hover:shadow-sari-lg hover:-translate-y-0.5 transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl shrink-0 shadow-sari-sm", p.color)}>
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100">{p.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.subtitle}</p>
                  </div>
                  <span className="text-kawaii-purple dark:text-kawaii-lavender font-extrabold group-hover:translate-x-1 transition-transform">→</span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const activePath = paths.find((p) => p.id === activePathId) ?? null;

  return (
    <div className="py-6 px-3">
      {/* Path switcher */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-3 px-3 mb-4" style={{ scrollbarWidth: "none" }}>
        {paths.map((p) => (
          <button
            key={p.id}
            onClick={() => choosePath(p.id)}
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

      {/* HUD */}
      {user && <RankHud user={user} compact />}

      {/* Continue card */}
      {activePath && (() => {
        const sorted = sortNodes(activePath.nodes);
        const next = sorted.find((n) => n.status === "available") ?? null;
        const nextLevel = next?.levels[0] ?? null;
        return (
          <Card className="mt-4 border-kawaii-purple/40 dark:border-dark-surface bg-gradient-to-br from-kawaii-lavender/15 via-white/80 to-kawaii-pink/15 dark:from-dark-surface/60 dark:via-dark-card/80 dark:to-dark-surface/60 overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <Link
                href={nextLevel ? `/learn/play/${nextLevel.id}` : "/learn/tree"}
                className={cn(
                  "w-20 h-20 rounded-full shrink-0 flex items-center justify-center text-3xl shadow-lg transition-all squishy",
                  nextLevel
                    ? "bg-gradient-to-br from-kawaii-purple to-kawaii-pink text-white shadow-kawaii-purple/40 animate-glow-pulse hover:scale-105"
                    : "bg-kawaii-lavender/40 text-slate-400"
                )}
              >
                {nextLevel ? <Play className="w-8 h-8 ml-1" /> : <Lock className="w-7 h-7" />}
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-kawaii-purple dark:text-kawaii-lavender">
                  {activePath.emoji} {activePath.title}
                </p>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                  {nextLevel ? next?.title : "All done for now!"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {nextLevel ? `+${nextLevel.xp_reward} XP · ${next?.subtitle}` : "You mastered every unlocked skill. Keep climbing! 🌱"}
                </p>
                {nextLevel && (
                  <Link href={`/learn/play/${nextLevel.id}`}>
                    <Button variant="primary" size="sm" className="mt-2">
                      Continue →
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Choose what to learn */}
      {activePath && (() => {
        const sorted = sortNodes(activePath.nodes);
        const ready = sorted.filter((n) => n.status === "available");
        const mastered = sorted.filter((n) => n.status === "completed");
        return (
          <div className="mt-4">
            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">🎯 Choose what to learn</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pick any ready mission and play it right now.</p>

            {ready.length === 0 ? (
              <Card className="mt-3 border-kawaii-lavender/25 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <span className="text-2xl">🌱</span>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Everything unlocked is mastered!</p>
                  <p className="text-xs text-slate-400">Grow your tree to unlock new missions.</p>
                  <Link href="/learn/tree">
                    <Button variant="primary" size="sm" className="mt-1">Open your tree →</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="mt-2 space-y-2">
                {ready.map((n) => {
                  const lvl = n.levels[0];
                  if (!lvl) return null;
                  return (
                    <Link key={n.id} href={`/learn/play/${lvl.id}`} className="block group">
                      <Card className="border-kawaii-purple/30 dark:border-dark-surface bg-white/80 dark:bg-dark-card/80 hover:border-kawaii-purple/70 hover:shadow-sari transition-all">
                        <CardContent className="p-3.5 flex items-center gap-3">
                          <span className={cn("w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-xl shrink-0 shadow-sari-sm", activePath.color)}>
                            {n.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm leading-tight">{n.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.subtitle}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender">
                              +{lvl.xp_reward} XP
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-kawaii-purple dark:text-kawaii-lavender group-hover:translate-x-0.5 transition-transform">
                              <Play className="w-3.5 h-3.5" /> Play
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            {mastered.length > 0 && (
              <div className="mt-3">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Mastered — practice again</h4>
                <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {mastered.map((n) => {
                    const lvl = n.levels[0];
                    if (!lvl) return null;
                    return (
                      <Link
                        key={n.id}
                        href={`/learn/play/${lvl.id}`}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-kawaii-mint/50 bg-kawaii-mint/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-kawaii-mint/20 transition-all squishy"
                      >
                        <Check className="w-3.5 h-3.5" /> {n.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* streak + stats */}
      {user && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card className="border-kawaii-lavender/25 dark:border-dark-surface bg-white/80 dark:bg-dark-card/80">
            <CardContent className="p-3 flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-kawaii-coral/15 flex items-center justify-center text-lg shrink-0"><Flame className="w-5 h-5 text-kawaii-coral" /></span>
              <div>
                <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">{user.streak} day{user.streak === 1 ? "" : "s"}</p>
                <p className="text-[10px] font-bold text-slate-400">daily streak</p>
              </div>
            </CardContent>
          </Card>
          <Link href="/learn/leaderboard">
            <Card className="border-kawaii-lavender/25 dark:border-dark-surface bg-white/80 dark:bg-dark-card/80 hover:shadow-sari-sm transition-shadow h-full">
              <CardContent className="p-3 flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-kawaii-purple/15 flex items-center justify-center text-lg shrink-0">🏆</span>
                <div>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">{user.xp} XP</p>
                  <p className="text-[10px] font-bold text-slate-400">tap to see ranks</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Your path (mini tree, bottom-up) */}
      {activePath && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Your skill tree</h3>
            <Link href="/learn/tree" className="text-xs font-bold text-kawaii-purple dark:text-kawaii-lavender">
              Open full tree 🌳 →
            </Link>
          </div>
          <Card className="border-kawaii-lavender/25 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="flex flex-col items-center">
                {[...sortNodes(activePath.nodes)].reverse().map((node) => (
                  <PathBead key={node.id} node={node} />
                ))}
                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink shadow-sari-sm" />
              </div>
              <p className="mt-3 text-[10px] font-bold text-slate-400 text-center">
                {activePath.completedNodes}/{activePath.totalNodes} skills mastered
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-kawaii-purple dark:text-kawaii-lavender text-center">
                🧬 your fingerprint: {fingerprintId(activePath.nodes)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
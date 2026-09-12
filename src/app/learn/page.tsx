"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RankHud, type HudUser } from "@/components/learn/rank-hud";
import { SkillTree } from "@/components/learn/skill-tree";
import type { PathWithNodes } from "@/lib/learn/types";
import { Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LearnHome() {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [user, setUser] = useState<HudUser | null>(null);
  const [paid, setPaid] = useState(false);
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
      setPaid(data.paid ?? false);
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
        <p className="text-slate-400 animate-pulse">Loading your skill tree…</p>
      </div>
    );
  }

  const activePath = paths.find((p) => p.id === activePathId) ?? null;

  // ── First visit: "What do you want to become?" ──
  if (!chosen) {
    return (
      <div className="py-10 px-2">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="text-5xl mb-3">🪪</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
            What do you want to <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">become</span>?
          </h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
            Pick your dream. We'll build your skill tree and take you from zero to job-ready — one quick mission at a time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map((p, i) => (
            <button
              key={p.id}
              onClick={() => choosePath(p.id)}
              disabled={switching !== null}
              className="text-left group animate-fade-in"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <Card className="h-full border-kawaii-lavender/30 dark:border-dark-surface bg-white/80 dark:bg-dark-card/80 hover:shadow-sari-lg hover:-translate-y-1 transition-all">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl mb-3", p.color)}>
                    {p.emoji}
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100">{p.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{p.subtitle}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex-1">{p.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender group-hover:gap-2 transition-all">
                    Choose this path →
                  </span>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Active path: skill tree ──
  return (
    <div className="py-6 px-2">
      {/* Path tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {paths.map((p) => (
          <button
            key={p.id}
            onClick={() => choosePath(p.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all squishy border-2",
              p.id === activePathId
                ? "border-kawaii-purple bg-kawaii-lavender/30 text-kawaii-purple dark:text-kawaii-lavender"
                : "border-kawaii-lavender/30 dark:border-dark-surface text-slate-500 hover:border-kawaii-purple/50"
            )}
          >
            <span>{p.emoji}</span>
            {p.title}
          </button>
        ))}
      </div>

      {user && <RankHud user={user} />}

      {activePath && (
        <div className="mt-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {activePath.emoji} {activePath.title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{activePath.subtitle}</p>
            <div className="mt-3 inline-flex items-center gap-2">
              <div className="h-2 w-40 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-500"
                  style={{ width: `${activePath.totalNodes ? (activePath.completedNodes / activePath.totalNodes) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-500">{activePath.completedNodes}/{activePath.totalNodes} skills</span>
            </div>
          </div>

          <SkillTree path={activePath} />
        </div>
      )}

      {/* Rank + upsell strip */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/learn/leaderboard" className="group">
          <Card className="h-full border-kawaii-lavender/30 dark:border-dark-surface bg-white/80 dark:bg-dark-card/80 hover:shadow-sari transition-all">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-2xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100">Climb the ranks</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Beat the bots. Top VAs get reviewed by agencies monthly.</p>
              </div>
              <span className="text-kawaii-purple group-hover:translate-x-1 transition-transform">→</span>
            </CardContent>
          </Card>
        </Link>

        {!paid && (
          <Card className="h-full border-kawaii-coral/40 dark:border-dark-surface bg-gradient-to-br from-kawaii-pink/10 to-kawaii-lavender/10">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-kawaii-coral to-kawaii-pink flex items-center justify-center text-2xl">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100">Unlock the full tree</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">The first skills are free. Go pro to master the rest.</p>
              </div>
              <Link href="/pricing">
                <Button variant="primary" size="sm">Upgrade</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { STREAK_MILESTONES } from "@/lib/streak";

export default function StreakPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<{
    streak: number;
    claimed: string[];
    freeMonthAvailable: boolean;
    next: { days: number; label: string } | null;
    milestones: typeof STREAK_MILESTONES;
  } | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/streak/ping", { method: "POST" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const claim = async (days: number) => {
    setClaiming(String(days));
    try {
      const res = await fetch("/api/streak/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone: days }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Claim failed");
      showToast(`🎁 Reward claimed: ${d.reward}`);
      const fresh = await fetch("/api/streak/ping", { method: "POST" }).then((r) => r.json());
      setData(fresh);
    } catch (e: any) {
      showToast(e?.message || "Claim failed", "error");
    } finally {
      setClaiming(null);
    }
  };

  const streak = data?.streak ?? 0;
  const claimed = new Set(data?.claimed ?? []);
  const next = data?.next;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-3xl font-extrabold">🔥 Dream Streak</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Show up every day. The longer your streak, the bigger the dream. Miss a day and it resets — so keep it alive.
      </p>

      {/* Streak hero */}
      <Card className="bg-gradient-to-r from-kawaii-purple/15 to-kawaii-pink/10 dark:from-kawaii-purple/10 dark:to-kawaii-pink/5">
        <CardContent className="p-8 text-center">
          <p className="text-6xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{streak}</p>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">{streak === 1 ? "day" : "days"} streak 🔥</p>
          {next ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
              Next milestone in <b>{next.days - streak}</b> day{next.days - streak === 1 ? "" : "s"} → {next.label}
            </p>
          ) : (
            <p className="text-sm text-green-600 dark:text-green-400 mt-3">You reached the dream. 🎉</p>
          )}
          {data?.freeMonthAvailable && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-bold">
              🎁 Your free Money Club month is ready — it will be applied on your next Money Club checkout.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Milestone ladder */}
      <Card>
        <CardHeader><CardTitle className="text-lg">The Dream Ladder</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {STREAK_MILESTONES.map((m) => {
            const reached = streak >= m.days;
            const isClaimed = claimed.has(String(m.days));
            return (
              <div key={m.days} className={`flex items-center justify-between gap-3 p-3 rounded-2xl ${reached ? "bg-kawaii-lavender/20 dark:bg-kawaii-purple/20" : "bg-white/50 dark:bg-dark-surface/40"}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${reached ? "bg-gradient-to-br from-kawaii-purple to-kawaii-pink text-white" : "bg-slate-100 dark:bg-dark-surface text-slate-400"}`}>
                    {m.days === 90 ? "👑" : "🔥"}
                  </span>
                  <div>
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{m.days} days</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
                  </div>
                </div>
                <div>
                  {reached ? (
                    isClaimed ? (
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">✅ Claimed</span>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => claim(m.days)} disabled={claiming === String(m.days)}>
                        {claiming === String(m.days) ? "..." : "Claim"}
                      </Button>
                    )
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">The streak advances when you open Sari each day. It's the dream that keeps you going. 🌱→🌳</p>
    </div>
  );
}
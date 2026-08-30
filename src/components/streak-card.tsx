"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function StreakCard() {
  const [streak, setStreak] = useState<number | null>(null);
  const [next, setNext] = useState<{ days: number; label: string } | null>(null);
  const [freeMonth, setFreeMonth] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/streak/ping", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (!active || !d) return;
        setStreak(d.streak ?? 0);
        setNext(d.next ?? null);
        setFreeMonth(!!d.freeMonthAvailable);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (streak == null) return null;

  return (
    <Link href="/dashboard/streak" className="block">
      <Card className="hover:border-kawaii-purple/50 transition-all">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                {streak} day{streak === 1 ? "" : "s"} streak
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {freeMonth
                  ? "Your free Money Club month is ready! 👑"
                  : next
                    ? `Next milestone: ${next.label} (in ${Math.max(0, next.days - streak)}d)`
                    : "Dream reached! 🎉"}
              </p>
            </div>
          </div>
          <span className="text-sm text-kawaii-purple dark:text-kawaii-lavender font-bold">→</span>
        </CardContent>
      </Card>
    </Link>
  );
}
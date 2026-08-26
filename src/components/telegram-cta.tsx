"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TelegramCta() {
  const [state, setState] = useState<"loading" | "hidden" | "show">("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/telegram/connect")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        // Only show the CTA when the bot is configured AND not yet linked.
        if (d.configured && !d.linked) setState("show");
        else setState("hidden");
      })
      .catch(() => setState("hidden"));
    return () => { active = false; };
  }, []);

  if (state !== "show") return null;

  return (
    <Card className="bg-gradient-to-r from-kawaii-lavender/20 to-kawaii-pink/10 dark:from-kawaii-lavender/10 dark:to-kawaii-pink/5 border-kawaii-lavender/40 dark:border-dark-surface">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📨</span>
          <div>
            <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Never miss a match again</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect Telegram and get new matches & follow-ups straight to your phone.
            </p>
          </div>
        </div>
        <Link href="/dashboard/settings">
          <Button size="sm" variant="primary" className="shrink-0">Connect Telegram →</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
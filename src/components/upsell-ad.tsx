"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* In-app upsell ads based on the user's plan:
   - Sari Sprout (free)  → ads for Sari Bloom + Sari Money Club
   - Sari Bloom (basic)  → ad for Sari Money Club
   - Sari Money Club (pro) → no ads
   Ads rotate through a few creatives. */
const ADS: Record<string, { emoji: string; title: string; text: string; cta: string; plan: string }[]> = {
  free: [
    { emoji: "🌱", title: "Sari Sprout → Sari Bloom", text: "3× more matching jobs a day, 10× the AI credits and 10 daily swaps.", cta: "Upgrade to Bloom ($4.99)", plan: "basic" },
    { emoji: "🌱", title: "Sari Sprout → Sari Money Club", text: "Unlimited matching jobs, 200 AI credits and 30 swaps a day.", cta: "Join Money Club ($9.99)", plan: "pro" },
    { emoji: "📈", title: "Ready to grow?", text: "Bloom gives you 100 matching jobs a day and a weekly AI budget that lasts.", cta: "See plans", plan: "basic" },
  ],
  basic: [
    { emoji: "👑", title: "Sari Bloom → Sari Money Club", text: "Unlimited matching jobs, 200 AI credits a month and 30 daily swaps.", cta: "Join Money Club ($9.99)", plan: "pro" },
    { emoji: "💎", title: "Go unlimited", text: "Money Club members never hit a job-view cap and get the biggest AI budget.", cta: "Upgrade now", plan: "pro" },
  ],
};

export default function UpsellAd() {
  const [plan, setPlan] = useState<string | null>(null);
  const [idx] = useState(() => Math.floor(Math.random() * 100));

  useEffect(() => {
    let active = true;
    fetch("/api/subscription-status")
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d) setPlan(d.plan ?? "free"); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const ads = plan ? ADS[plan] : null;
  if (!ads || ads.length === 0) return null;

  const ad = ads[idx % ads.length];

  return (
    <Card className="border-kawaii-lavender/40 dark:border-dark-surface bg-gradient-to-r from-kawaii-lavender/15 to-kawaii-pink/10 dark:from-kawaii-lavender/10 dark:to-kawaii-pink/5">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{ad.emoji}</span>
          <div>
            <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{ad.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{ad.text}</p>
          </div>
        </div>
        <Link href="/pricing">
          <Button size="sm" variant="primary" className="shrink-0">{ad.cta} →</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
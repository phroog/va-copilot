"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { PathWithNodes } from "@/lib/learn/types";
import type { HudUser } from "@/components/learn/rank-hud";
import { cn } from "@/lib/utils";

interface FeedItem {
  icon: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  accent: "green" | "red" | "gold" | "purple" | "blue";
  time: string;
  urgent?: boolean;
}

const ACCENT = {
  green: { border: "border-dl-green/50", bar: "bg-dl-green", chip: "bg-dl-green text-white" },
  red: { border: "border-dl-red/50", bar: "bg-dl-red", chip: "bg-dl-red text-white" },
  gold: { border: "border-dl-gold/50", bar: "bg-dl-gold", chip: "bg-dl-gold text-[#854c00]" },
  purple: { border: "border-dl-purple/50", bar: "bg-dl-purple", chip: "bg-dl-purple text-white" },
  blue: { border: "border-dl-blue/50", bar: "bg-dl-blue", chip: "bg-dl-blue text-white" },
};

export default function FeedPage() {
  const [paths, setPaths] = useState<PathWithNodes[]>([]);
  const [user, setUser] = useState<HudUser | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"feed" | "events">("feed");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/learn/tree");
        if (res.status === 401) {
          window.location.href = "/auth/login?returnUrl=/feed";
          return;
        }
        const d = await res.json();
        setPaths(d?.paths ?? []);
        setUser(d?.user ?? null);
        try {
          const lb = await fetch("/api/learn/leaderboard").then((r) => r.json());
          setRank(lb?.user?.rank ?? null);
        } catch {
          // ignore
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activePath = paths.find((p) => p.id === (user as any)?.activePathId) ?? paths[0] ?? null;
  const mastered = activePath?.completedNodes ?? 0;

  const items: FeedItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // live / dynamic
  if (user && user.streak > 0 && user.lastActive != null && user.lastActive !== today) {
    items.push({
      icon: "🔥",
      title: "Your streak is at risk!",
      desc: "You haven't played today. Finish one lesson to keep your streak alive.",
      href: "/learn",
      cta: "Save my streak",
      accent: "red",
      time: "now",
      urgent: true,
    });
  }
  if (user && user.xpForNextLevel) {
    const toNext = Math.max(0, user.xpForNextLevel - user.xpIntoLevel);
    if (toNext > 0) {
      items.push({
        icon: "⚡",
        title: `${toNext} XP to Level ${user.level + 1}`,
        desc: "Close to the next level — a couple of missions will do it.",
        href: "/learn",
        cta: "Play now",
        accent: "purple",
        time: "now",
      });
    }
  }
  if (activePath && mastered > 0) {
    items.push({
      icon: "🏅",
      title: `${mastered} skills sealed on your Badge`,
      desc: `Your live certificate just updated — ${mastered} skills mastered in ${activePath.title}.`,
      href: "/badge",
      cta: "View my Badge",
      accent: "gold",
      time: "just now",
    });
  }
  if (rank) {
    items.push({
      icon: "🏆",
      title: `You're ranked #${rank}`,
      desc: "Top VAs get reviewed by real agencies every month — and maybe recruited.",
      href: "/learn/leaderboard",
      cta: "Climb the board",
      accent: "blue",
      time: "2h ago",
    });
  }
  items.push({
    icon: "🎁",
    title: "Daily reward drop",
    desc: "Your free daily reward is ready to claim. New drops reset every day.",
    href: "/dashboard/wheel",
    cta: "Claim drop",
    accent: "green",
    time: "daily",
  });

  // FOMO events
  items.push({
    icon: "🎉",
    title: "Double XP weekend",
    desc: "Earn double XP on every mission until the weekend ends. Don't miss it.",
    href: "/learn",
    cta: "Start earning",
    accent: "purple",
    time: "ends in 1d 6h",
    urgent: true,
  });
  items.push({
    icon: "📡",
    title: "Sari Season 1",
    desc: "The season ends soon. Final ranks lock in — every XP counts now.",
    href: "/learn/leaderboard",
    cta: "See standings",
    accent: "blue",
    time: "ends in 9d",
  });
  items.push({
    icon: "🆕",
    title: "New course unlocked",
    desc: "More VA paths are waiting. Add a course and grow a new tree.",
    href: "/learn",
    cta: "Browse courses",
    accent: "gold",
    time: "3h ago",
  });
  items.push({
    icon: "🧊",
    title: "Streak Freeze available",
    desc: "Protect your streak from breaking. Check the shop before it slips away.",
    href: "/dashboard/credits",
    cta: "Get it",
    accent: "green",
    time: "offer",
    urgent: true,
  });

  // Past community sessions (Google Meet) — informational, no commitments.
  const EVENTS = [
    { emoji: "🎙️", title: "Pricing & Packaging Masterclass", topic: "Rates", date: "Aug 18, 2026", duration: "45 min", status: "Ended · Recording available" },
    { emoji: "✉️", title: "Email Automation 101", topic: "Inbox Ops", date: "Sep 02, 2026", duration: "30 min", status: "Ended · Notes published" },
    { emoji: "🤝", title: "Client Onboarding Bootcamp", topic: "Clients", date: "Sep 09, 2026", duration: "40 min", status: "Ended · Recording available" },
    { emoji: "🗂️", title: "Notion Systems for VAs", topic: "Tools", date: "Sep 14, 2026", duration: "50 min", status: "Ended" },
    { emoji: "🤖", title: "AI Tools Deep Dive", topic: "AI", date: "Sep 17, 2026", duration: "35 min", status: "Ended · Highlights" },
  ];

  if (loading) {
    return (
      <div className="py-6 px-4 max-w-[480px] mx-auto space-y-3">
        <div className="h-9 w-40 rounded-2xl bg-white/5 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 px-4 max-w-[480px] mx-auto pb-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-extrabold text-white">Feed</h1>
        <span className="text-xs font-bold text-white/40">{tab === "events" ? "live events" : "live updates"}</span>
      </div>

      {/* tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#1f2233] border border-white/10 mt-3 mb-5">
        <button
          onClick={() => setTab("feed")}
          className={cn("py-2 rounded-xl text-[13px] font-extrabold transition-all squishy", tab === "feed" ? "bg-dl-purple text-white shadow-btn-purple" : "text-white/50 hover:text-white")}
        >
          📡 Feed
        </button>
        <button
          onClick={() => setTab("events")}
          className={cn("py-2 rounded-xl text-[13px] font-extrabold transition-all squishy", tab === "events" ? "bg-dl-green text-white shadow-btn-green" : "text-white/50 hover:text-white")}
        >
          📅 Live events
        </button>
      </div>

      {tab === "events" ? (
        <>
          <p className="text-[13px] text-white/50 mb-4">
            Community Google Meet sessions for VAs — workshops, recaps &amp; recordings from past sessions.
          </p>
          <div className="space-y-2.5">
            {EVENTS.map((ev, i) => (
              <motion.div
                key={ev.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative rounded-3xl bg-[#1f2233] border border-white/10 overflow-hidden"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-dl-green" />
                <div className="pl-5 pr-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ev.emoji}</span>
                    <p className="font-extrabold text-white text-[15px] flex-1">{ev.title}</p>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/50 bg-white/5 px-2 py-0.5 rounded-full">{ev.topic}</span>
                  </div>
                  <p className="text-[13px] text-white/55 mt-1">
                    Google Meet · {ev.date} · {ev.duration}
                  </p>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[11px] font-bold text-dl-green">{ev.status}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-[11px] text-white/35 mt-5">
            New sessions are announced in the feed. Watch the community space for the next meet.
          </p>
        </>
      ) : (
      <div className="space-y-2.5">
        {items.map((it, i) => {
          const a = ACCENT[it.accent];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn("relative rounded-3xl bg-[#1f2233] border overflow-hidden", a.border, it.urgent && "animate-fade-in")}
            >
              <span className={cn("absolute left-0 top-0 bottom-0 w-1.5", a.bar)} />
              <div className="pl-5 pr-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{it.icon}</span>
                  <p className="font-extrabold text-white text-[15px] flex-1">{it.title}</p>
                  {it.urgent && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-dl-red bg-dl-red/15 px-2 py-0.5 rounded-full animate-twinkle">New</span>
                  )}
                </div>
                <p className="text-[13px] text-white/55 mt-1">{it.desc}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <Link href={it.href} className={cn("px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-btn-sm hover:brightness-110 transition-all", a.chip)}>
                    {it.cta}
                  </Link>
                  <span className="text-[10px] font-bold text-white/35">{it.time}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
    </motion.div>
  );
}
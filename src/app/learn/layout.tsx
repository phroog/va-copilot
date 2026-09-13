"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mochi } from "@/components/learn/mochi";
import { useSoundSettings } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/learn", label: "Learn", icon: "🏠", match: (p: string) => p === "/learn" },
  { href: "/dashboard", label: "Tools", icon: "🔧", match: (p: string) => p.startsWith("/dashboard") },
  { href: "/learn/leaderboard", label: "Ranks", icon: "🏆", match: (p: string) => p.startsWith("/learn/leaderboard") },
  { href: "/dashboard/credits", label: "Shop", icon: "🛍️", match: (p: string) => p.startsWith("/dashboard/credits") },
  { href: "/dashboard/settings", label: "Profile", icon: "👤", match: (p: string) => p.startsWith("/dashboard/settings") },
];

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inLesson = pathname.startsWith("/learn/play");
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [gems, setGems] = useState<number | null>(null);
  const [courseEmoji, setCourseEmoji] = useState("🍠");
  const { settings, toggleSound, toggleHaptic } = useSoundSettings();

  useEffect(() => {
    fetch("/api/learn/tree")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          setStreak(d.user.streak ?? 0);
          setXp(d.user.xp ?? 0);
        }
        const active = (d?.paths ?? []).find((p: any) => p.id === d?.activePathId) ?? d?.paths?.[0];
        if (active?.emoji) setCourseEmoji(active.emoji);
      })
      .catch(() => {});
    fetch("/api/ai/credits")
      .then((r) => r.json())
      .then((d) => setGems(d.balance ?? 0))
      .catch(() => {});
  }, []);

  const HudItem = ({ icon, value, flicker }: { icon: string; value: number | string; flicker?: boolean }) => (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className={cn("text-[22px] leading-none", flicker && "animate-flame")}>{icon}</span>
      <span className="text-base font-extrabold text-white tabular-nums">{value}</span>
    </span>
  );

  return (
    <div
      className="dark min-h-screen text-white"
      style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #131628 100%)" }}
    >
      {/* Top HUD — always visible */}
      {!inLesson && (
        <header className="sticky top-0 z-50">
          <div className="h-14 px-3 flex items-center justify-between bg-[#131628]/80 backdrop-blur border-b border-white/5">
            <div className="flex items-center gap-3.5">
              <Link
                href="/learn/courses"
                className="w-9 h-9 rounded-xl bg-[#1f2233] border border-white/10 flex items-center justify-center text-[22px] leading-none hover:border-dl-purple/60 transition-colors"
                title="Switch course"
              >
                {courseEmoji}
              </Link>
              <HudItem icon="🔥" value={streak} flicker={streak >= 7} />
              <HudItem icon="💎" value={gems ?? "…"} />
              <HudItem icon="⚡" value={xp} />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSound}
                className="w-9 h-9 rounded-xl bg-[#1f2233] border border-white/10 flex items-center justify-center text-lg leading-none hover:border-white/30 transition-colors"
                title={settings.sound ? "Mute sounds" : "Unmute sounds"}
              >
                {settings.sound ? "🔊" : "🔇"}
              </button>
              <button
                onClick={toggleHaptic}
                className="w-9 h-9 rounded-xl bg-[#1f2233] border border-white/10 flex items-center justify-center text-lg leading-none hover:border-white/30 transition-colors"
                title={settings.haptic ? "Disable vibration" : "Enable vibration"}
              >
                {settings.haptic ? "📳" : "🔕"}
              </button>
              <Link href="/learn" className="flex items-center gap-2">
                <span className="text-[24px] leading-none">🍠</span>
                <span className="text-lg font-extrabold text-white hidden sm:inline">Sari</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      <div className="mx-auto max-w-[720px] lg:pl-[220px]">
        {/* Desktop sidebar nav */}
        {!inLesson && (
          <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[200px] flex-col gap-2 px-3 py-4 border-r border-white/5 bg-[#131628]">
            <Link href="/learn" className="flex items-center gap-2 px-3 py-3 mb-2">
              <span className="text-[28px] leading-none">🍠</span>
              <span className="text-xl font-extrabold text-white">Sari</span>
            </Link>
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[15px] font-bold transition-all",
                    active ? "bg-dl-purple text-white shadow-btn-purple" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="text-2xl leading-none">{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
          </aside>
        )}

        <main className={cn(!inLesson && "pb-24 lg:pb-10")}>{children}</main>
      </div>

      {/* Mobile bottom nav */}
      {!inLesson && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          <div
            className="mx-3 mb-2 rounded-3xl border border-white/10 bg-[#1f2233] shadow-card-glow flex items-center justify-around py-2 px-1"
            style={{ boxShadow: "0 -6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all",
                    active ? "bg-dl-purple/20" : "hover:bg-white/5"
                  )}
                >
                  <span className={cn("text-[26px] leading-none", active ? "drop-shadow-[0_2px_6px_rgba(165,96,240,0.6)]" : "grayscale opacity-70")}>
                    {tab.icon}
                  </span>
                  <span className={cn("text-[10px] font-extrabold", active ? "text-dl-purpleLight" : "text-white/40")}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <Mochi />
    </div>
  );
}
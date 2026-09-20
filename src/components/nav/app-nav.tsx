"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Mochi } from "@/components/learn/mochi";
import { CourseSheet } from "@/components/learn/course-sheet";
import { PermissionsSheet } from "@/components/settings/permissions-sheet";
import { ReminderToast } from "@/components/nav/reminder-toast";
import { useSoundSettings, registerAudioUnlock } from "@/lib/sounds";
import { playSound } from "@/lib/sounds";
import { setupPWA } from "@/lib/pwa";
import { useLocale } from "@/lib/i18n/context";
import { TOOL_GROUPS } from "./sidebar-groups";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/learn", label: "Learn", icon: "🏠", match: (p: string) => p.startsWith("/learn") && !p.startsWith("/learn/leaderboard") && !p.startsWith("/learn/play") },
  { href: "/dashboard", label: "Tools", icon: "🔧", match: (p: string) => p.startsWith("/dashboard") },
  { href: "/feed", label: "Feed", icon: "📡", match: (p: string) => p.startsWith("/feed") },
  { href: "/badge", label: "Badge", icon: "🏅", match: (p: string) => p.startsWith("/badge") },
  { href: "/learn/leaderboard", label: "Ranks", icon: "🏆", match: (p: string) => p.startsWith("/learn/leaderboard") },
];

const PROFILE_MENU = [
  { href: "/dashboard/settings", icon: "👤", label: "Profile & settings" },
  { href: "/pricing", icon: "💳", label: "Subscription" },
  { href: "/dashboard/credits", icon: "🛍️", label: "Shop" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { settings, toggleSound, toggleHaptic } = useSoundSettings();
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [gems, setGems] = useState<number | null>(null);
  const [courseEmoji, setCourseEmoji] = useState("🍠");
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [permsOpen, setPermsOpen] = useState(false);

  useEffect(() => {
    setupPWA();
    registerAudioUnlock();
  }, []);

  const inLesson = pathname.startsWith("/learn/play");
  const isTools = pathname.startsWith("/dashboard");

  const loadHud = () => {
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
  };

  useEffect(() => {
    loadHud();
  }, []);

  // Lazy reminder check: evaluates the signed-in user whenever the app opens
  // (fallback to the GitHub Actions cron — works even with zero cron slots).
  useEffect(() => {
    fetch("/api/cron/reminders?lazy=1").catch(() => {});
  }, []);

  return (
    <div className="dark min-h-screen text-white" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #131628 100%)" }}>
      {/* Desktop sidebar */}
      {!inLesson && (
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-[#1f2233] border-r border-white/5">
          <Link href="/learn" className="flex items-center gap-2 px-5 py-5">
            <span className="text-[28px] leading-none">🍠</span>
            <span className="text-xl font-extrabold text-white">Sari</span>
          </Link>
          <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => playSound("tap")}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[15px] font-bold transition-all squishy",
                    active ? "bg-dl-purple text-white shadow-btn-purple" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="text-2xl leading-none">{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
            {isTools && (
              <div className="mt-3 border-t border-white/5 pt-3">
                <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-white/40">Tools</p>
                <ToolsSidebarNav />
              </div>
            )}
          </nav>
        </aside>
      )}

      <div className={cn("min-w-0", !inLesson && "lg:pl-64")}>
        {/* Top HUD */}
        {!inLesson && (
          <header className="sticky top-0 z-50">
            <div className="relative h-14 px-3 flex items-center justify-between bg-[#131628]/80 backdrop-blur border-b border-white/5">
              <div className="flex items-center gap-2 sm:gap-3.5">
                <button
                  onClick={() => setCoursesOpen(true)}
                  className="w-9 h-9 rounded-xl bg-[#1f2233] border border-white/10 flex items-center justify-center text-[20px] sm:text-[22px] leading-none hover:border-dl-purple/60 transition-colors shrink-0"
                  title="Switch course"
                >
                  {courseEmoji}
                </button>
                <span className="flex items-center gap-1 min-w-0">
                  <span className={cn("text-[20px] sm:text-[22px] leading-none", streak >= 7 && "animate-flame")}>🔥</span>
                  <span className="text-base font-extrabold text-white tabular-nums">{streak}</span>
                </span>
                <Link href="/dashboard/credits" className="flex items-center gap-1 min-w-0" title="Shop">
                  <span className="text-[20px] sm:text-[22px] leading-none">💎</span>
                  <span className="text-base font-extrabold text-white tabular-nums">{gems ?? "…"}</span>
                </Link>
                <span className="hidden sm:flex items-center gap-1 min-w-0">
                  <span className="text-[22px] leading-none">⚡</span>
                  <span className="text-base font-extrabold text-white tabular-nums">{xp}</span>
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={toggleSound}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1f2233] border border-white/10 flex items-center justify-center text-base sm:text-lg leading-none hover:border-white/30 transition-colors shrink-0"
                  title={settings.sound ? "Mute sounds" : "Unmute sounds"}
                >
                  {settings.sound ? "🔊" : "🔇"}
                </button>
                <button
                  onClick={toggleHaptic}
                  className="hidden sm:flex w-9 h-9 rounded-xl bg-[#1f2233] border border-white/10 items-center justify-center text-lg leading-none hover:border-white/30 transition-colors shrink-0"
                  title={settings.haptic ? "Disable vibration" : "Enable vibration"}
                >
                  {settings.haptic ? "📳" : "🔕"}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="w-9 h-9 rounded-xl bg-[#1f2233] border border-white/10 flex items-center justify-center text-lg leading-none hover:border-white/30 transition-colors"
                    title="Profile & settings"
                  >
                    ⚙️
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-12 z-[70] w-52 rounded-2xl bg-[#1f2233] border border-white/10 shadow-2xl p-1.5 animate-pop-in">
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setCoursesOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-white/80 hover:bg-white/5 hover:text-white transition-colors text-left"
                        >
                          <span className="text-lg leading-none">🎯</span>
                          Switch course
                        </button>
                        {PROFILE_MENU.map((m) => (
                          <Link
                            key={m.href}
                            href={m.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <span className="text-lg leading-none">{m.icon}</span>
                            {m.label}
                          </Link>
                        ))}
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setPermsOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-white/80 hover:bg-white/5 hover:text-white transition-colors text-left"
                        >
                          <span className="text-lg leading-none">🔔</span>
                          Permissions
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <Link href="/learn" className="flex items-center gap-2">
                  <span className="text-[24px] leading-none">🍠</span>
                  <span className="text-lg font-extrabold text-white hidden sm:inline">Sari</span>
                </Link>
              </div>
            </div>
          </header>
        )}

        {/* Tools sub-nav is in the desktop sidebar (accordion) and in the tools
        hub on mobile — nothing extra to render here. */}

        <main className={cn(!inLesson && "pb-24 lg:pb-10")}>{children}</main>
      </div>

      {/* Mobile bottom nav */}
      {!inLesson && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          <div
            className="mx-3 mb-2 rounded-3xl border border-white/10 bg-[#1f2233] flex items-center justify-around py-2 px-1"
            style={{ boxShadow: "0 -6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => playSound("tap")}
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
      <ReminderToast />

      <CourseSheet open={coursesOpen} onClose={() => setCoursesOpen(false)} onCourseChanged={loadHud} />
      <PermissionsSheet open={permsOpen} onClose={() => setPermsOpen(false)} />
    </div>
  );
}

// Desktop: tools as accordion sub-nav inside the sidebar.
function ToolsSidebarNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const saved: Record<string, boolean> = {};
    TOOL_GROUPS.forEach((g) => {
      const active = g.links.some((l) => l.href === pathname);
      saved[g.labelKey] = g.defaultOpen || active;
    });
    return saved;
  });

  return (
    <div className="space-y-1">
      {TOOL_GROUPS.map((group) => {
        const isOpen = open[group.labelKey];
        const hasActive = group.links.some((l) => l.href === pathname);
        return (
          <div key={group.labelKey}>
            <button
              onClick={() => setOpen((prev) => ({ ...prev, [group.labelKey]: !prev[group.labelKey] }))}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all",
                hasActive ? "text-dl-purpleLight" : "text-white/40 hover:bg-white/5"
              )}
            >
              <span className="text-base leading-none">{group.emoji}</span>
              <span className="flex-1 text-left">{t(group.labelKey)}</span>
              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {isOpen && (
              <div className="ml-2 space-y-0.5 mt-0.5">
                {group.links.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-2xl text-sm font-bold transition-all squishy",
                        active ? "bg-dl-purple text-white shadow-btn-purple" : "text-white/60 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <link.icon className="w-4 h-4" />
                      <span className="flex-1">{t(link.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
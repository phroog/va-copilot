"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/learn", label: "Learn", emoji: "🎯", match: (p: string) => p === "/learn" },
  { href: "/learn/tree", label: "Tree", emoji: "🌳", match: (p: string) => p.startsWith("/learn/tree") },
  { href: "/learn/leaderboard", label: "Ranks", emoji: "🏆", match: (p: string) => p.startsWith("/learn/leaderboard") },
  { href: "/dashboard", label: "Tools", emoji: "🧰", match: (p: string) => p.startsWith("/dashboard") },
];

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inLesson = pathname.startsWith("/learn/play");

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg overflow-hidden">
      {/* soft game background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="blob w-96 h-96 bg-kawaii-purple top-[-10%] left-[-10%]" />
        <div className="blob w-80 h-80 bg-kawaii-pink bottom-[-10%] right-[-15%]" />
        <div className="blob w-64 h-64 bg-kawaii-lavender top-[45%] right-[-8%]" />
      </div>

      {/* mobile = phone column · desktop (lg+) = full web layout */}
      <div className={cn("relative z-10 mx-auto min-h-screen flex flex-col", inLesson ? "max-w-md" : "max-w-md lg:max-w-5xl")}>
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-kawaii-lavender/20 dark:border-dark-surface">
          <div className="flex items-center justify-between px-4 h-14">
            <Link href="/learn" className="flex items-center gap-2">
              <span className="text-2xl">🍠</span>
              <span className="text-lg font-extrabold bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
                Sari
              </span>
              <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender">
                VA Academy
              </span>
            </Link>

            {/* desktop nav */}
            {!inLesson && (
              <nav className="hidden lg:flex items-center gap-1">
                {TABS.map((tab) => {
                  const active = tab.match(pathname);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold transition-all squishy",
                        active ? "bg-kawaii-lavender/30 text-kawaii-purple dark:text-kawaii-lavender" : "text-slate-500 hover:bg-kawaii-lavender/10"
                      )}
                    >
                      <span className="text-base">{tab.emoji}</span>
                      {tab.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className="flex items-center gap-1.5">
              <LanguageDropdown />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* content */}
        <main className={cn("relative flex-1", !inLesson && "pb-24 lg:pb-10")}>{children}</main>

        {/* mobile bottom tabs */}
        {!inLesson && (
          <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
            <div className="mx-3 mb-3 rounded-3xl bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-kawaii-lavender/30 dark:border-dark-surface shadow-sari-lg flex items-center justify-around py-2 px-1">
              {TABS.map((tab) => {
                const active = tab.match(pathname);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all squishy",
                      active ? "bg-kawaii-lavender/30 dark:bg-dark-surface" : "hover:bg-kawaii-lavender/10"
                    )}
                  >
                    <span className={cn("text-xl leading-none", active && "animate-bounce")}>{tab.emoji}</span>
                    <span className={cn("text-[10px] font-extrabold", active ? "text-kawaii-purple dark:text-kawaii-lavender" : "text-slate-400")}>
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
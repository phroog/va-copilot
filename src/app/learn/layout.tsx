"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageDropdown } from "@/components/language-dropdown";
import { Trophy } from "lucide-react";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const inLesson = pathname.startsWith("/learn/play");

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg overflow-hidden">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-kawaii-lavender/30 dark:border-dark-surface">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/learn" className="flex items-center gap-2">
            <span className="text-2xl">🍠</span>
            <span className="text-lg font-extrabold bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
              Sari
            </span>
            <span className="hidden sm:inline text-xs font-bold px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender">
              VA Academy
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/learn/leaderboard">
              <Button variant="outline" size="sm">
                <Trophy className="w-4 h-4 mr-1" /> Ranks
              </Button>
            </Link>
            <LanguageDropdown />
            <ThemeToggle />
            {!inLesson && (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">🍠 Tools</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="blob w-96 h-96 bg-kawaii-purple top-[-10%] left-[-10%]" />
          <div className="blob w-80 h-80 bg-kawaii-pink bottom-[-10%] right-[-15%]" />
          <div className="blob w-64 h-64 bg-kawaii-lavender top-[40%] right-[-8%]" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4">{children}</div>
      </main>
    </div>
  );
}

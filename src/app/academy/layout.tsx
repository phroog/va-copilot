"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/lib/i18n/context";

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  const isAuthPage = pathname === "/academy/login" || pathname === "/academy/signup";
  const isLanding = pathname === "/academy";

  const navLinks = [
    { href: "/academy", label: "🎓 " + t("academy"), active: pathname === "/academy" },
    { href: "/academy/dashboard", label: "📊 " + t("dashboard"), active: pathname.startsWith("/academy/dashboard") },
    { href: "/academy/masterclasses", label: "📚 " + t("allMasterclasses"), active: pathname.startsWith("/academy/masterclass") || pathname === "/academy/masterclasses" },
    { href: "/dashboard/chat", label: "💬 " + t("community"), active: false },
    { href: "/dashboard", label: "🍠 Sari", active: false },
  ];

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-kawaii-lavender/30 dark:border-dark-surface">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/academy" className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-lg font-extrabold bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
              {t("academy")}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-2xl text-sm font-medium transition-all squishy ${
                  link.active
                    ? "bg-kawaii-lavender/40 text-kawaii-purple dark:text-kawaii-lavender"
                    : "text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/20"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Link href="/academy/dashboard">
                <Button variant="primary" size="sm">📊 {t("dashboard")}</Button>
              </Link>
            ) : !isAuthPage && !isLanding ? (
              <Link href="/academy/login">
                <Button variant="primary" size="sm">{t("login")}</Button>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex overflow-x-auto px-4 pb-2 gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all squishy ${
                link.active
                  ? "bg-kawaii-lavender/40 text-kawaii-purple"
                  : "text-slate-500 hover:bg-kawaii-lavender/20"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="relative">
        <div className="blob w-72 h-72 bg-kawaii-pink top-[-5%] left-[-10%] -z-0" />
        <div className="blob w-64 h-64 bg-kawaii-lavender bottom-[-5%] right-[-10%] -z-0" />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}

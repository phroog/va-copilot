"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LanguageDropdown } from "@/components/language-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/context";

export default function Header() {
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  const navLinks = [
    { href: "#features", label: t("navFeatures") },
    { href: "#how-it-works", label: t("navHowItWorks") },
    { href: "#pricing", label: t("navPricing") },
    { href: "/academy", label: "🎓 " + t("navAcademy") },
    { href: user ? "/dashboard" : "/", label: "🍠 Sari" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-dark-bg/70 backdrop-blur-xl border-b border-sari-lavender/30 dark:border-dark-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <span className="text-2xl">🍠</span>
            <span className="text-xl font-extrabold bg-gradient-to-r from-sari-ube to-sari-coral bg-clip-text text-transparent">
              Sari
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sari-ube dark:hover:text-sari-lavender transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageDropdown />
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button variant="primary" size="sm">📊 {t("dashboard")}</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">{t("logIn")}</Button>
                </Link>
                <Link href="/start">
                  <Button variant="primary" size="sm">{t("getStarted")} ✨</Button>
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-slate-500">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-sari-lavender/20 dark:border-dark-surface bg-white dark:bg-dark-card px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sari-ube">
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-sari-lavender/20 dark:border-dark-surface">
            <LanguageDropdown />
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="flex-1">
                <Button variant="primary" className="w-full" size="sm">📊 {t("dashboard")}</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="flex-1">
                  <Button variant="ghost" className="w-full" size="sm">{t("logIn")}</Button>
                </Link>
                <Link href="/start" className="flex-1">
                  <Button variant="primary" className="w-full" size="sm">{t("getStarted")} ✨</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
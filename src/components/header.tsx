"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-dark-bg/70 backdrop-blur-lg border-b border-kawaii-lavender/30 dark:border-dark-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-xl font-extrabold bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
              VA Copilot
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-kawaii-purple dark:hover:text-kawaii-lavender transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="primary" size="sm">Get Started ✨</Button>
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-slate-500">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-kawaii-lavender/20 dark:border-dark-surface bg-white dark:bg-dark-card px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-kawaii-purple">
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t border-kawaii-lavender/20 dark:border-dark-surface">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/auth/login" className="flex-1">
              <Button variant="ghost" className="w-full" size="sm">Log In</Button>
            </Link>
            <Link href="/auth/signup" className="flex-1">
              <Button variant="primary" className="w-full" size="sm">Sign Up ✨</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

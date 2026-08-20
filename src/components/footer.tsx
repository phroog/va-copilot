"use client";

import Link from "next/link";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useLocale } from "@/lib/i18n/context";

export default function Footer() {
  const { t } = useLocale();
  const footerLinks = [
    { label: t("navFeatures"), href: "#features" },
    { label: t("navHowItWorks"), href: "#how-it-works" },
    { label: t("navPricing"), href: "#pricing" },
    { label: t("navAcademy"), href: "/academy" },
    { label: t("footerFinance"), href: "/dashboard/finances" },
    { label: t("footerPricing"), href: "/pricing" },
  ];

  return (
    <footer className="border-t border-sari-lavender/30 dark:border-dark-surface bg-white/50 dark:bg-dark-bg/50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍠</span>
            <span className="font-extrabold bg-gradient-to-r from-sari-ube to-sari-coral bg-clip-text text-transparent">
              Sari
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-sari-ube dark:hover:text-sari-lavender transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <LanguageDropdown />
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center mt-6">{t("footerTagline")}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">{t("footerMadeWith")}</p>
      </div>
    </footer>
  );
}
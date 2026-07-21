"use client";

import { useLocale } from "@/lib/i18n/context";

const locales = [
  { code: "en" as const, flag: "🇺🇸", label: "English" },
  { code: "vi" as const, flag: "🇻🇳", label: "Tiếng Việt" },
  { code: "ph" as const, flag: "🇵🇭", label: "Filipino" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-0.5 bg-white/60 dark:bg-dark-card/60 rounded-full p-0.5 border border-sari-lavender/20 dark:border-dark-surface">
      {locales.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all squishy ${
            locale === l.code
              ? "bg-gradient-to-r from-sari-ube to-sari-coral text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-sari-ube"
          }`}
          title={l.label}
        >
          <span className="text-sm">{l.flag}</span>
          <span className="hidden sm:inline">{l.label}</span>
        </button>
      ))}
    </div>
  );
}

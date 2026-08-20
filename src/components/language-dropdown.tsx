"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "@/lib/i18n/context";
import { Check, ChevronDown } from "lucide-react";

const LOCALES = [
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "vi", flag: "🇻🇳", label: "Tiếng Việt" },
  { code: "ph", flag: "🇵🇭", label: "Filipino" },
] as const;

export function LanguageDropdown({ align = "right" }: { align?: "right" | "left" }) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-dark-card/70 border border-kawaii-lavender/30 dark:border-dark-surface hover:bg-kawaii-lavender/20 transition-all squishy"
        title="Language"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-2 w-44 rounded-2xl bg-white dark:bg-dark-card shadow-xl border border-kawaii-lavender/30 dark:border-dark-surface py-1.5 z-50 animate-slide-up`}
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium transition-colors ${
                locale === l.code
                  ? "text-kawaii-purple dark:text-kawaii-lavender bg-kawaii-lavender/20 dark:bg-dark-surface"
                  : "text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/10"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1 text-left">{l.label}</span>
              {locale === l.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
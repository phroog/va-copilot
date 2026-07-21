"use client";

import { useLocale } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";

const locales = [
  { code: "en" as const, labelKey: "language.en" },
  { code: "vi" as const, labelKey: "language.vi" },
  { code: "ph" as const, labelKey: "language.ph" },
];

export function LanguageSwitcher() {
  const { t, locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <Button
          key={l.code}
          variant={locale === l.code ? "default" : "ghost"}
          size="sm"
          onClick={() => setLocale(l.code)}
          className="text-xs px-2 py-1 h-auto"
        >
          {t(l.labelKey)}
        </Button>
      ))}
    </div>
  );
}

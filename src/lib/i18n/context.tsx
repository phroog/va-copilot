"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

type Locale = "en" | "vi" | "ph" | "th";
type TranslationRecord = Record<string, string>;

interface LocaleContextType {
  t: (key: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// English is the always-on fallback: if a key is missing from the active
// locale (or the locale file fails to load), we show the English value.
import enFallback from "@/locales/en.json";

async function loadTranslations(locale: Locale): Promise<TranslationRecord> {
  try {
    const mod = await import(`@/locales/${locale}.json`);
    return mod.default || mod;
  } catch {
    return {};
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] = useState<TranslationRecord>({});

  useEffect(() => {
    const stored = localStorage.getItem("va-copilot-locale") as Locale | null;
    if (stored && ["en", "vi", "ph", "th"].includes(stored)) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    loadTranslations(locale).then(setMessages);
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("va-copilot-locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return messages[key] || (enFallback as unknown as TranslationRecord)[key] || key;
    },
    [messages]
  );

  return (
    <LocaleContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}

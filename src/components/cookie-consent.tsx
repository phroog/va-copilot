"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "sari-cookie-consent";

/* Minimal, ePrivacy-compliant cookie banner. Sari itself only uses essential
   cookies (session/auth, theme, locale preference) — these are exempt from
   consent but we still inform the user. Third-party services (Stripe checkout,
   Google OAuth) set their own cookies on their own domains. No tracking/
   analytics cookies are set by Sari. */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-4 sm:right-auto sm:max-w-md z-[100] rounded-3xl bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface shadow-2xl p-5 animate-slide-up">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">🍪 Cookies</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        We use essential cookies to run the service (login, language &amp; theme
        preferences) and to make payments and third-party logins work. If you accept,
        we also load analytics (Meta Pixel) to measure how people use Sari and improve
        our marketing — never to sell your data. See our{" "}
        <a href="/legal/privacy#cookies" className="text-kawaii-purple dark:text-kawaii-lavender underline">Cookie Policy</a>.
      </p>
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={accept}
          className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
        >
          Accept
        </button>
        <a
          href="/legal/privacy"
          className="px-4 py-2 rounded-xl border border-kawaii-lavender/40 dark:border-dark-surface text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-kawaii-lavender/10"
        >
          Learn more
        </a>
      </div>
    </div>
  );
}
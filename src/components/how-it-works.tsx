"use client";

import { useLocale } from "@/lib/i18n/context";

export default function HowItWorks() {
  const { t } = useLocale();
  const steps = [
    { step: "1", emoji: "📝", title: t("hiw1Title"), description: t("hiw1Desc") },
    { step: "2", emoji: "📡", title: t("hiw2Title"), description: t("hiw2Desc") },
    { step: "3", emoji: "🚀", title: t("hiw3Title"), description: t("hiw3Desc") },
    { step: "4", emoji: "🛡️", title: t("hiw4Title"), description: t("hiw4Desc") },
    { step: "5", emoji: "💰", title: t("hiw5Title"), description: t("hiw5Desc") },
  ];
  return (
    <section id="how-it-works" className="py-16 px-4 bg-kawaii-lavender/15 dark:bg-dark-surface/20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">
            {t("hiwTitle")} 🚀
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            {t("hiwSub")}
          </p>
        </div>
        <div className="space-y-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-white font-extrabold shrink-0 text-lg">
                {s.emoji}
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">{s.step}. {s.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:block w-px h-8 bg-kawaii-lavender/30 dark:bg-dark-surface ml-6 mt-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
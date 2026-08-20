"use client";

import { useLocale } from "@/lib/i18n/context";

export default function ProblemSection() {
  const { t } = useLocale();
  const problems = [
    { emoji: "🌪️", key: "problemBoard" },
    { emoji: "🎭", key: "problemScams" },
    { emoji: "😰", key: "problemFollowups" },
    { emoji: "🧾", key: "problemInvoices" },
  ];
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">
          {t("problemTitle")}
        </h2>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          {t("problemSub")}
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {problems.map((p) => (
            <div key={p.key} className="rounded-3xl bg-white/70 dark:bg-dark-card/70 border border-kawaii-lavender/30 dark:border-dark-surface p-5">
              <span className="text-3xl block mb-2">{p.emoji}</span>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t(p.key)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
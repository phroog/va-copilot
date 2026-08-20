"use client";

import { useLocale } from "@/lib/i18n/context";

const PLATFORMS = ["Upwork", "OnlineJobs.ph", "Freelancer", "Indeed", "Guru", "WorkingNomads", "RemoteOK", "Reddit"];

export default function TrustBar() {
  const { t } = useLocale();
  return (
    <section className="py-12 bg-kawaii-lavender/20 dark:bg-dark-surface/30">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">
          {t("trustedBy")}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 text-slate-400 dark:text-slate-500">
          {PLATFORMS.map((p) => (
            <span key={p} className="text-lg font-bold">{p}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
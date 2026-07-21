"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/context";

const levelColors: Record<string, string> = {
  beginner: "bg-kawaii-mint/30 text-green-700 dark:text-green-300",
  intermediate: "bg-kawaii-peach/30 text-yellow-700 dark:text-yellow-300",
  advanced: "bg-kawaii-lavender/30 text-kawaii-purple",
  expert: "bg-kawaii-pink/30 text-pink-700 dark:text-pink-300",
  business: "bg-blue-200/30 text-blue-700 dark:text-blue-300",
};

const levelEmojis: Record<string, string> = {
  beginner: "🌱", intermediate: "📈", advanced: "⚡", expert: "🚀", business: "💼",
};

export default function AllMasterclasses() {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [levels, setLevels] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/academy/login"); return; }
      fetch("/api/academy/masterclasses")
        .then((r) => r.json())
        .then((data) => setLevels(data.levels ?? []))
        .finally(() => setLoading(false));
    });
  }, [supabase, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-slate-400 animate-pulse">{t("loading")}...</p></div>;
  }

  const allMCs = levels.flatMap((l: any) =>
    l.masterclasses.map((m: any) => ({ ...m, level: l.level }))
  );

  const filtered = filter === "all" ? allMCs : allMCs.filter((m) => m.level === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">📚 {t("allMasterclasses")}</h1>
        <Link href="/academy/dashboard">
          <Button variant="outline" size="sm">← {t("dashboard")}</Button>
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {["all", "beginner", "intermediate", "advanced", "expert", "business"].map((l) => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all squishy ${
              filter === l
                ? "bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white shadow-md"
                : "bg-white/60 dark:bg-dark-card/60 text-slate-500 hover:bg-kawaii-lavender/20"
            }`}
          >
            {l === "all" ? t("all") : `${levelEmojis[l] ?? ""} ${l.charAt(0).toUpperCase() + l.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((mc: any) => (
          <Link key={mc.id} href={`/academy/masterclass/${mc.id}`}>
            <Card className="h-full squishy hover:shadow-lg transition-shadow">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${levelColors[mc.level] ?? ""}`}>
                    {levelEmojis[mc.level] ?? ""} {mc.level.charAt(0).toUpperCase() + mc.level.slice(1)}
                  </span>
                  <span className="text-xs text-slate-400">{mc.duration_minutes}min</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {mc.completed && <span className="text-green-500 text-sm">✅</span>}
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{mc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{mc.description}</p>
                </div>
                {mc.quiz_score !== null && (
                  <div className="mt-3 pt-3 border-t border-kawaii-lavender/20">
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">🏆 {t("quizScore")}: {mc.quiz_score}/5</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-slate-400 py-12">{t("noMasterclasses")}</p>
      )}
    </div>
  );
}

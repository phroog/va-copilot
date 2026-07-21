"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/context";

interface LevelGroup {
  level: string;
  masterclasses: any[];
}

const levelMeta: Record<string, { emoji: string; label: string; color: string }> = {
  beginner: { emoji: "🌱", label: "Beginner", color: "from-kawaii-mint to-green-300" },
  intermediate: { emoji: "📈", label: "Intermediate", color: "from-kawaii-peach to-yellow-300" },
  advanced: { emoji: "⚡", label: "Advanced", color: "from-kawaii-purple to-kawaii-lavender" },
  expert: { emoji: "🚀", label: "Expert", color: "from-kawaii-pink to-kawaii-coral" },
  business: { emoji: "💼", label: "Business", color: "from-blue-400 to-kawaii-purple" },
};

const levelOrder = ["beginner", "intermediate", "advanced", "expert", "business"];

export default function AcademyDashboard() {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [levels, setLevels] = useState<LevelGroup[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/academy/login"); return; }
      setUser(data.user);
      Promise.all([
        fetch("/api/academy/masterclasses").then((r) => r.json()),
        fetch("/api/academy/progress").then((r) => r.json()),
      ]).then(([mcData, progData]) => {
        setLevels(mcData.levels ?? []);
        setCertificates(progData.certificates ?? []);
        setTotal(progData.total_masterclasses ?? 0);
      }).finally(() => setLoading(false));
    });
  }, [supabase, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-slate-400 animate-pulse">{t("loading")}...</p></div>;
  }

  const allMCs = levels.flatMap((l) => l.masterclasses);
  const completed = allMCs.filter((m) => m.completed).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            🎓 {t("academyDashboard")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t("academyProgress")}: {completed}/{total} {t("masterclasses").toLowerCase()} {t("completed")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">🛠️ VA Copilot</Button>
          </Link>
        </div>
      </div>

      {/* Tool banner */}
      <Card className="bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/5 dark:to-kawaii-pink/5 border-none">
        <CardContent className="p-4 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">🛠️ {t("academyToolBanner")}</p>
          <Link href="/dashboard">
            <Button variant="primary" size="sm">{t("tryVACopilot")} 🚀</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Level cards */}
      <div className="space-y-4">
        {levelOrder.map((levelKey) => {
          const group = levels.find((l) => l.level === levelKey);
          const meta = levelMeta[levelKey];
          if (!group || !meta) return null;
          const mc = group.masterclasses;
          const done = mc.filter((m) => m.completed).length;
          const totalLevel = mc.length;
          const pct = totalLevel > 0 ? Math.round((done / totalLevel) * 100) : 0;
          const allDone = done === totalLevel && totalLevel > 0;
          const cert = certificates.find((c) => c.level === levelKey);

          return (
            <Card key={levelKey} className="overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${meta.color} bg-opacity-10 pb-3`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {meta.emoji} {meta.label}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {cert && <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold">🏆 {t("certified")}</span>}
                    {allDone && !cert && <span className="text-xs px-2 py-1 rounded-full bg-kawaii-lavender/30 text-kawaii-purple font-bold">✅ {t("completed")}</span>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-500">{done}/{totalLevel}</span>
                </div>
                <div className="space-y-2">
                  {mc.map((m: any) => (
                    <Link key={m.id} href={`/academy/masterclass/${m.id}`} className="block">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-kawaii-lavender/15 dark:bg-dark-surface/30 hover:bg-kawaii-lavender/30 transition-all squishy">
                        <div className="flex items-center gap-2 min-w-0">
                          {m.completed ? <span className="text-green-500 shrink-0">✅</span> : <span className="text-slate-300 shrink-0">◻️</span>}
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{m.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.quiz_score !== null && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-kawaii-mint/30 text-green-700 dark:text-green-300 font-bold">{m.quiz_score}/5</span>
                          )}
                          <span className="text-xs text-slate-400">{m.duration_minutes}min</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resources link */}
      <div className="text-center">
        <p className="text-sm text-slate-400">
          📚 {t("academyResourcesHint")}{" "}
          <a href="/resources" className="text-kawaii-purple dark:text-kawaii-lavender underline">{t("downloadCheatsheets")}</a>
        </p>
      </div>
    </div>
  );
}

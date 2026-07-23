"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JobInfo {
  title: string;
  platform: string;
  budget: string;
}

interface Application {
  id: string;
  status: string;
  content: string;
  polished_content: string | null;
  created_at: string;
  jobs: JobInfo | null;
}

const columns = [
  { key: "draft", label: "📝 Draft", color: "border-slate-300 dark:border-slate-600" },
  { key: "sent", label: "📨 Sent", color: "border-blue-300 dark:border-blue-700" },
  { key: "interview", label: "🎯 Interview", color: "border-purple-300 dark:border-purple-700" },
  { key: "offer", label: "💌 Offer", color: "border-green-300 dark:border-green-700" },
  { key: "won", label: "🏆 Won", color: "border-emerald-300 dark:border-emerald-700" },
  { key: "lost", label: "💔 Lost", color: "border-red-300 dark:border-red-700" },
];

const statusFlow: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["interview", "lost"],
  interview: ["offer", "lost"],
  offer: ["won", "lost"],
  won: [],
  lost: [],
};

export default function PipelinePage() {
  const { t } = useLocale();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((data) => setApps(data.applications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const moveStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch {}
  };

  const getColumnApps = (key: string) => apps.filter((a) => a.status === key);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-3xl font-extrabold">📊 {t("pipeline")}</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-32" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-3xl font-extrabold">📊 {t("pipeline")}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.key} className={`bg-white/60 dark:bg-dark-card/60 rounded-2xl border-t-4 ${col.color} p-3 min-w-[160px]`}>
            <h3 className="font-bold text-sm mb-3 text-slate-700 dark:text-slate-200">
              {col.label} <span className="text-slate-400 font-normal">({getColumnApps(col.key).length})</span>
            </h3>
                <div
                  className="space-y-2 max-h-[70vh] overflow-y-auto min-h-[60px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("appId");
                    if (id) moveStatus(id, col.key);
                  }}
                >
              {getColumnApps(col.key).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">—</p>
              ) : (
                getColumnApps(col.key).map((app) => (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("appId", app.id)}
                    className="bg-white dark:bg-dark-surface border border-kawaii-lavender/20 dark:border-dark-surface rounded-xl p-3 squishy shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                  >
                    <button className="w-full text-left" onClick={() => setDetailApp(app)}>
                      <p className="text-sm font-semibold truncate">{app.jobs?.title ?? "Unknown"}</p>
                      <p className="text-xs text-slate-400 truncate">{app.jobs?.platform ?? ""}</p>
                    </button>
                    {statusFlow[app.status]?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {statusFlow[app.status].map((next) => {
                          const lbl = columns.find((c) => c.key === next)?.label.split(" ").slice(1).join(" ") || next;
                          return (
                            <button
                              key={next}
                              onClick={() => moveStatus(app.id, next)}
                              className="text-xs px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-slate-600 dark:text-slate-300 hover:bg-kawaii-purple/30 transition-colors"
                            >
                              → {lbl}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailApp} onOpenChange={(o) => { if (!o) setDetailApp(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              📄 {detailApp?.jobs?.title ?? "Unknown"}
            </DialogTitle>
          </DialogHeader>
          {detailApp && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{detailApp.jobs?.platform ?? "—"}</Badge>
                {detailApp.jobs?.budget && <Badge variant="secondary">💰 {detailApp.jobs.budget}</Badge>}
                <Badge className={detailApp.status === "won" ? "bg-emerald-500" : detailApp.status === "lost" ? "bg-red-400" : "bg-kawaii-purple"}>
                  {detailApp.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">{new Date(detailApp.created_at).toLocaleDateString()}</p>
              <div className="bg-kawaii-lavender/10 dark:bg-dark-surface/50 rounded-2xl p-4">
                <p className="text-sm whitespace-pre-wrap">{detailApp.polished_content || detailApp.content}</p>
              </div>
              {detailApp.jobs?.platform && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`/dashboard/jobs`} className="text-xs">🔍 View Job</a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

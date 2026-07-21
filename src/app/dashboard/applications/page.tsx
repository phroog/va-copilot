"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

interface Application {
  id: string;
  status: string;
  created_at: string;
  jobs: { title: string; platform: string; budget: string } | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  interview: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  offer: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const statusEmojis: Record<string, string> = {
  draft: "📝",
  sent: "📨",
  interview: "🎯",
  offer: "💌",
  won: "🏆",
  lost: "💔",
};

const statuses = ["all", "draft", "sent", "interview", "offer", "won", "lost"];

export default function ApplicationsPage() {
  const { t } = useLocale();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      setApps(data.applications ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchApps();
    } catch {
      // silent
    }
    setMenuOpen(null);
  };

  const deleteApp = async (id: string) => {
    try {
      await fetch("/api/applications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchApps();
    } catch {
      // silent
    }
  };

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-extrabold">📋 {t("applications")}</h1>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all squishy ${
                filter === s
                  ? "bg-kawaii-purple text-white"
                  : "bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface text-slate-600 dark:text-slate-300"
              }`}
            >
              {s === "all" ? "🔵 All" : `${statusEmojis[s] ?? ""} ${s.charAt(0).toUpperCase() + s.slice(1)}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 h-5 w-1/3 bg-kawaii-lavender/30 rounded-full" />
                <div className="h-6 w-16 bg-kawaii-lavender/20 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-slate-400">{t("noApplications")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <Card key={app.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-xl">{statusEmojis[app.status] ?? "📄"}</span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{app.jobs?.title ?? "Unknown Job"}</p>
                    <p className="text-xs text-slate-400">
                      {app.jobs?.platform ?? ""} — {app.jobs?.budget ?? ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={statusColors[app.status] ?? ""}>
                    {app.status}
                  </Badge>
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMenuOpen(menuOpen === app.id ? null : app.id)}
                    >
                      ⋮
                    </Button>
                    {menuOpen === app.id && (
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface rounded-2xl shadow-xl p-1 w-36">
                        {statuses.filter((s) => s !== "all" && s !== app.status).map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(app.id, s)}
                            className="block w-full text-left px-4 py-2 text-sm rounded-xl hover:bg-kawaii-lavender/20 dark:hover:bg-dark-surface squishy"
                          >
                            {statusEmojis[s] ?? ""} Move to {s}
                          </button>
                        ))}
                        <hr className="my-1 border-kawaii-lavender/20" />
                        <button
                          onClick={() => deleteApp(app.id)}
                          className="block w-full text-left px-4 py-2 text-sm rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 squishy"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

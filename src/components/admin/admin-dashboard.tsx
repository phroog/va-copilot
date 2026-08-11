"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface PlatformCount {
  platform: string;
  count: number;
}

interface SourceRow {
  id: string;
  name: string;
  platform: string | null;
  url: string;
  is_active: boolean;
  include_in_live_feed: boolean;
  last_collected_at: string | null;
  last_collected_age_min: number | null;
  created_at: string | null;
  keywords?: string[];
}

interface AdminStats {
  generated_at: string;
  users: { total_users: number; profiles: number; new_last_7d: number };
  jobs: { total: number; today: number; last_7d: number; last_hour: number; per_platform: PlatformCount[] };
  sources: SourceRow[];
  activity: { saved_jobs: number; applied_jobs: number; total_pitches: number; total_interactions: number };
  recent_jobs: {
    id: string;
    title: string;
    platform: string | null;
    url: string;
    client_name: string | null;
    posted_at: string | null;
    collected_at: string;
    budget: string | null;
  }[];
}

const maxPlatformCount = (per: PlatformCount[]) => Math.max(1, ...per.map((p) => p.count));

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return "";
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PLATFORM_COLORS = ["bg-kawaii-purple", "bg-kawaii-pink", "bg-kawaii-peach", "bg-kawaii-mint", "bg-kawaii-coral", "bg-kawaii-lavender", "bg-slate-400"];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<string | null>(null);
  const [keywordDrafts, setKeywordDrafts] = useState<Record<string, string>>({});
  const [savingKw, setSavingKw] = useState<string | null>(null);
  const [recent, setRecent] = useState<AdminStats["recent_jobs"]>([]);
  const sourceById = useRef<Map<string, SourceRow>>(new Map());

  const fetchStats = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load admin stats");
      const data: AdminStats = await res.json();
      setStats(data);
      setRecent(data.recent_jobs);
      data.sources.forEach((s) => sourceById.current.set(s.id, s));
      const drafts: Record<string, string> = {};
      data.sources.forEach((s) => {
        drafts[s.id] = (s.keywords ?? []).join(", ");
      });
      setKeywordDrafts((prev) => Object.keys(drafts).length > 0 ? { ...prev, ...drafts } : prev);
    } catch (e: any) {
      if (!silent) console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  const toggleSource = async (source: SourceRow) => {
    setToggling(source.id);
    try {
      const res = await fetch("/api/admin/source-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: source.id, is_active: !source.is_active }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Toggle failed");
      }
      await fetchStats(true);
    } catch (e: any) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  const saveKeywords = async (source: SourceRow) => {
    setSavingKw(source.id);
    try {
      const keywords = (keywordDrafts[source.id] ?? "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/keywords", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: [{ id: source.id, keywords }] }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Save failed");
      }
      await fetchStats(true);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSavingKw(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg p-6">
        <div className="blob" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center">
        <p className="text-slate-400">Failed to load admin data.</p>
      </div>
    );
  }

  const maxCount = maxPlatformCount(stats.jobs.per_platform);

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg p-6 relative overflow-hidden">
      <div className="blob w-96 h-96 bg-kawaii-purple top-[-10%] right-[-10%]" />
      <div className="blob w-80 h-80 bg-kawaii-pink bottom-[-10%] left-[-10%]" />

      <div className="relative z-10 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">🔐 Sari Admin</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Private operator dashboard · last refreshed {timeAgo(stats ? stats.generated_at : null)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                live
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-slate-100 text-slate-400 dark:bg-dark-surface dark:text-slate-500"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${live ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
              {live ? "LIVE" : "polling"}
            </span>
            <Button variant="outline" size="sm" onClick={() => fetchStats(true)}>🔄 Refresh</Button>
            <Button variant="outline" size="sm" onClick={logout}>🚪 Logout</Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Users" value={stats.users.total_users} sub={`${stats.users.new_last_7d} new · 7d`} emoji="👥" color="from-kawaii-purple to-kawaii-pink" />
          <KpiCard label="Jobs in Feed" value={stats.jobs.total} sub={`${stats.jobs.last_hour} last hour`} emoji="💼" color="from-kawaii-pink to-kawaii-coral" />
          <KpiCard label="Jobs Today" value={stats.jobs.today} sub={`${stats.jobs.last_7d} last 7d`} emoji="📈" color="from-kawaii-peach to-kawaii-purple" />
          <KpiCard label="Saved by Users" value={stats.activity.saved_jobs} sub={`${stats.activity.applied_jobs} applied`} emoji="💾" color="from-kawaii-mint to-kawaii-purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🌐 Jobs per Platform</CardTitle>
              <CardDescription>Total scraped jobs split by source platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.jobs.per_platform.length === 0 ? (
                <p className="text-sm text-slate-400">No jobs collected yet.</p>
              ) : (
                stats.jobs.per_platform.map((p, i) => (
                  <div key={p.platform} className="flex items-center gap-3">
                    <span className="text-sm font-bold w-32 truncate text-slate-700 dark:text-slate-200">{p.platform}</span>
                    <div className="flex-1 h-4 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full ${PLATFORM_COLORS[i % PLATFORM_COLORS.length]}`}
                        style={{ width: `${Math.round((p.count / maxCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-extrabold w-14 text-right">{p.count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Source status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔤 Job Sources + Keywords</CardTitle>
              <CardDescription>Status, last poll and the search keywords the collector types/submits per source</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[34rem] overflow-y-auto">
              {stats.sources.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-kawaii-lavender/20 dark:border-dark-surface space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
                        <Badge variant={s.is_active ? "success" : "outline"}>{s.is_active ? "active" : "off"}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {s.last_collected_at ? `last polled ${timeAgo(s.last_collected_at)}` : "never polled"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={s.is_active ? "outline" : "primary"}
                      onClick={() => toggleSource(s)}
                      disabled={toggling === s.id}
                    >
                      {toggling === s.id ? "..." : s.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={keywordDrafts[s.id] ?? ""}
                      onChange={(e) => setKeywordDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="virtual assistant, data entry, ..."
                      className="flex-1 min-w-0 rounded-xl border-2 border-kawaii-lavender/30 bg-white/80 px-3 py-1.5 text-xs text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveKeywords(s)}
                      disabled={savingKw === s.id}
                    >
                      {savingKw === s.id ? "..." : "Save"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Activity row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Pitches" value={stats.activity.total_pitches} emoji="🚀" color="from-kawaii-purple to-kawaii-lavender" />
          <KpiCard label="Interactions" value={stats.activity.total_interactions} emoji="🖱️" color="from-kawaii-coral to-kawaii-pink" />
          <KpiCard label="Profiles" value={stats.users.profiles} emoji="🧑‍🤝‍🧑" color="from-kawaii-mint to-kawaii-coral" />
          <KpiCard label="Active Sources" value={stats.sources.filter((s) => s.is_active).length} sub={`of ${stats.sources.length}`} emoji="🟢" color="from-kawaii-peach to-kawaii-mint" />
        </div>

        {/* Live feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">📡 Live Feed — recent collection activity</CardTitle>
              <CardDescription>Newest jobs picked up by the collector</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-slate-400">No jobs collected yet. Run the collector to fill the feed.</p>
            ) : (
              recent.slice(0, 12).map((job) => (
                <div
                  key={job.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                    newIds.has(job.id)
                      ? "ring-2 ring-kawaii-purple/60 bg-kawaii-purple/5 dark:bg-kawaii-purple/10"
                      : "border-kawaii-lavender/20 dark:border-dark-surface"
                  }`}
                >
                  <div className="min-w-0">
                    {newIds.has(job.id) && (
                      <span className="text-xs px-2 py-0.5 bg-kawaii-purple/15 text-kawaii-purple dark:text-kawaii-lavender rounded-full font-bold animate-pulse mr-2">
                        ✨ NEW
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {job.url ? (
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:text-kawaii-purple dark:hover:text-kawaii-lavender">
                          {job.title} <span className="text-xs text-slate-300 dark:text-slate-500">↗</span>
                        </a>
                      ) : (
                        job.title
                      )}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {job.platform || "—"}
                      {job.client_name ? ` · ${job.client_name}` : ""}
                      {job.budget ? ` · 💰 ${job.budget}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(job.collected_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  emoji,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  emoji: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-3xl font-extrabold mt-1">{value ?? "—"}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-xl`}>
            {emoji}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
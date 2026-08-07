"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface FeedJob {
  id: string;
  source_id: string | null;
  title: string;
  description: string | null;
  budget: string | null;
  url: string;
  platform: string | null;
  skills: string[] | null;
  client_name: string | null;
  client_country: string | null;
  client_rating: number | null;
  experience_level: string | null;
  posted_at: string | null;
  collected_at: string;
  is_saved: boolean;
  is_applied: boolean;
  matching_score: number | null;
  pitch_id: string | null;
}

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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function scoreClass(score: number | null): string {
  if (score == null) return "";
  if (score >= 70) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (score >= 40) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

export default function LiveFeedPage() {
  const { showToast } = useToast();
  const supabase = createClient();
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [savingAll, setSavingAll] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [pitchJob, setPitchJob] = useState<FeedJob | null>(null);
  const [pitchResult, setPitchResult] = useState<string | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const scoredRef = useRef<Set<string>>(new Set());

  const applyDefaults = useCallback((job: any): FeedJob => ({
    ...job,
    is_saved: job.is_saved ?? false,
    is_applied: job.is_applied ?? false,
    matching_score: job.matching_score ?? null,
    pitch_id: job.pitch_id ?? null,
  }), []);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs/feed");
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      setJobs((data.jobs ?? []).map(applyDefaults));
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load feed", "error");
    } finally {
      setLoading(false);
    }
  }, [applyDefaults, showToast]);

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: new global jobs appear automatically
  useEffect(() => {
    const channel = supabase
      .channel("global-jobs-live-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_jobs" },
        (payload: any) => {
          const job = payload.new;
          if (!job?.id) return;
          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          const collected = new Date(job.collected_at).getTime();
          if (isNaN(collected) || collected < cutoff) return;
          setJobs((prev) => [applyDefaults(job), ...prev.filter((j) => j.id !== job.id)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, applyDefaults]);

  // Batch-score jobs that don't have a score yet
  useEffect(() => {
    if (loading || jobs.length === 0) return;
    const unscored = jobs.filter(
      (j) => j.matching_score == null && !scoredRef.current.has(j.id)
    );
    if (unscored.length === 0) return;
    unscored.slice(0, 50).forEach((j) => scoredRef.current.add(j.id));
    setScoring(true);
    fetch("/api/jobs/calculate-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ globalJobIds: unscored.slice(0, 50).map((j) => j.id) }),
    })
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<string, number>();
        (data.jobs ?? []).forEach((s: any) => map.set(s.id, s.matching_score));
        setJobs((prev) =>
          prev.map((j) => (map.has(j.id) ? { ...j, matching_score: map.get(j.id)! } : j))
        );
      })
      .catch(() => {})
      .finally(() => setScoring(false));
  }, [loading, jobs]);

  const toggleSave = async (job: FeedJob) => {
    setSavingIds((prev) => new Set(prev).add(job.id));
    try {
      const res = await fetch("/api/jobs/feed/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global_job_id: job.id, is_saved: !job.is_saved }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, is_saved: !job.is_saved } : j))
      );
      showToast(job.is_saved ? "Removed from saved" : "Saved to your list 💾");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to save job", "error");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  const saveAllVisible = async () => {
    const visible = filtered.filter((j) => !j.is_saved);
    if (visible.length === 0) {
      showToast("Nothing to save — all visible jobs are already saved");
      return;
    }
    setSavingAll(true);
    try {
      for (const job of visible) {
        await fetch("/api/jobs/feed/interact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ global_job_id: job.id, is_saved: true }),
        });
      }
      setJobs((prev) => prev.map((j) => (visible.some((v) => v.id === j.id) ? { ...j, is_saved: true } : j)));
      showToast(`Saved ${visible.length} job(s) 💾`);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to save jobs", "error");
    } finally {
      setSavingAll(false);
    }
  };

  const generatePitch = async (job: FeedJob) => {
    setGeneratingId(job.id);
    setPitchJob(job);
    setPitchResult(null);
    setPitchLoading(true);
    try {
      const res = await fetch("/api/jobs/feed/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global_job_id: job.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate pitch");
      setPitchResult(data.pitch);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? {
                ...j,
                is_saved: true,
                pitch_id: data.interaction?.pitch_id ?? j.pitch_id,
              }
            : j
        )
      );
    } catch (e: any) {
      setPitchResult(null);
      showToast(e?.message ?? "Failed to generate pitch", "error");
    } finally {
      setPitchLoading(false);
      setGeneratingId(null);
    }
  };

  const platforms = Array.from(new Set(jobs.map((j) => j.platform).filter((p): p is string => !!p))).sort();

  const filtered = jobs.filter((j) => {
    if (search && !(j.title + (j.description ?? "")).toLowerCase().includes(search.toLowerCase())) return false;
    if (scoreFilter === "high" && (j.matching_score ?? 0) < 70) return false;
    if (scoreFilter === "medium" && ((j.matching_score ?? 0) < 40 || (j.matching_score ?? 0) >= 70)) return false;
    if (scoreFilter === "low" && (j.matching_score ?? 0) >= 40) return false;
    if (platformFilter !== "all" && j.platform !== platformFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">📡 Live Feed</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global jobs scraped by the admin web collector — updated live. Filter by role, platform or score.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scoring && (
            <span className="text-xs text-slate-400 animate-pulse">Scoring jobs...</span>
          )}
          <Button variant="primary" size="sm" onClick={saveAllVisible} disabled={savingAll || filtered.length === 0}>
            {savingAll ? "Saving..." : "💾 Save All Visible"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-kawaii-lavender/30 dark:border-dark-surface">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <Input
            placeholder="🔍 Search feed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs"
          />
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
          >
            <option value="all">🎯 All scores</option>
            <option value="high">✅ High (70+)</option>
            <option value="medium">🟡 Medium (40-69)</option>
            <option value="low">🔻 Low (&lt;40)</option>
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
          >
            <option value="all">🌐 All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-5 w-3/4 bg-kawaii-lavender/30 rounded-full mb-3" />
                <div className="h-4 w-1/2 bg-kawaii-lavender/20 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-3">📡</p>
            <p className="text-slate-400">
              {jobs.length === 0
                ? "No jobs collected yet. Run the admin collector to fill the feed."
                : "No jobs match the current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((job) => (
            <FeedJobCard
              key={job.id}
              job={job}
              saving={savingIds.has(job.id)}
              generating={generatingId === job.id}
              onToggleSave={() => toggleSave(job)}
              onGeneratePitch={() => generatePitch(job)}
            />
          ))}
        </div>
      )}

      {/* Pitch Dialog */}
      <Dialog open={!!pitchJob} onOpenChange={(open) => !open && setPitchJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🚀 Pitch — {pitchJob?.title}</DialogTitle>
            <DialogDescription>Edit your pitch below, then copy it to your clipboard.</DialogDescription>
          </DialogHeader>
          {pitchLoading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <span className="w-4 h-4 border-2 border-kawaii-purple/30 border-t-kawaii-purple rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Generating pitch (1 credit)...</span>
            </div>
          ) : (
            <>
              <Textarea
                value={pitchResult ?? ""}
                onChange={(e) => setPitchResult(e.target.value)}
                rows={12}
                className="text-sm mt-2"
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pitchJob && generatePitch(pitchJob)}
                  disabled={pitchLoading}
                >
                  🔄 Regenerate (1🪙)
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (pitchResult) {
                      navigator.clipboard.writeText(pitchResult);
                      showToast("Pitch copied to clipboard 📋");
                    }
                  }}
                  disabled={!pitchResult}
                >
                  📋 Copy
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeedJobCard({
  job,
  saving,
  generating,
  onToggleSave,
  onGeneratePitch,
}: {
  job: FeedJob;
  saving: boolean;
  generating: boolean;
  onToggleSave: () => void;
  onGeneratePitch: () => void;
}) {
  return (
    <Card className="flex border-kawaii-lavender/30 dark:border-dark-surface hover:border-kawaii-purple/50 transition-all">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-start gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {job.platform && (
              <Badge variant="secondary" className="bg-kawaii-lavender/20 dark:bg-dark-surface text-kawaii-purple dark:text-kawaii-lavender">
                {job.platform}
              </Badge>
            )}
            {job.experience_level && (
              <span className="text-xs px-2 py-0.5 bg-kawaii-lavender/20 dark:bg-kawaii-purple/20 rounded-full font-medium text-slate-600 dark:text-slate-300">
                {job.experience_level}
              </span>
            )}
            {job.budget && <span className="text-sm font-bold text-slate-700 dark:text-slate-200">💰 {job.budget}</span>}
          </div>
          <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 leading-snug">
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-kawaii-purple dark:hover:text-kawaii-lavender transition-colors"
              >
                {job.title} <span className="text-xs text-slate-300 dark:text-slate-500">↗</span>
              </a>
            ) : (
              job.title
            )}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            📅 {job.posted_at ? "Posted " + timeAgo(job.posted_at) : "Collected " + timeAgo(job.collected_at)}
            {job.client_name ? ` · 👤 ${job.client_name}${job.client_country ? " (" + job.client_country + ")" : ""}` : ""}
          </p>
          {job.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2">
              {job.description}
            </p>
          )}
          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.skills.slice(0, 6).map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 bg-kawaii-lavender/20 dark:bg-kawaii-purple/20 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-3 shrink-0">
          <span
            className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg ${scoreClass(job.matching_score)}`}
            title={job.matching_score != null ? "Matching score" : "Not scored yet"}
          >
            {job.matching_score != null ? job.matching_score : "—"}
          </span>
          <div className="flex items-center gap-2 md:flex-col md:items-stretch">
            <Button size="sm" variant={job.is_saved ? "outline" : "primary"} onClick={onToggleSave} disabled={saving}>
              {saving ? "..." : job.is_saved ? "💾 Saved" : "💾 Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={onGeneratePitch} disabled={generating}>
              {generating ? "Loading..." : job.pitch_id ? "🚀 View Pitch" : "🚀 Pitch"}
            </Button>
          </div>
          {job.is_saved && <span className="text-xs text-kawaii-purple dark:text-kawaii-lavender">💾 Saved</span>}
          {job.is_applied && <span className="text-xs text-green-600 dark:text-green-400">✅ Applied</span>}
        </div>
      </CardContent>
    </Card>
  );
}

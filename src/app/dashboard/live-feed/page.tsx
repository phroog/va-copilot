"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
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
import UpsellAd from "@/components/upsell-ad";

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
  category: string | null;
  posted_at: string | null;
  collected_at: string;
  is_saved: boolean;
  is_applied: boolean;
  matching_score: number | null;
  matched_skills: string[];
  pitch_id: string | null;
  profile_match: number | null;
  profile_vector?: number[];
  scam_risk: number | null;
  scam_level: string | null;
  scam_flags?: string[];
  clickable?: boolean;
  locked?: boolean;
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

const SCAM_META: Record<string, { emoji: string; label: string; cls: string }> = {
  green: { emoji: "🟢", label: "Low", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  yellow: { emoji: "🟡", label: "Medium", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  orange: { emoji: "🟠", label: "Elevated", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  red: { emoji: "🔴", label: "High", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

function ScamBadge({ level, risk, flags }: { level: string; risk: number | null; flags?: string[] }) {
  const m = SCAM_META[level] || SCAM_META.green;
  const tip = flags && flags.length ? `${risk ?? "?"}% Risk · ${flags.join("; ")}` : `${risk ?? "?"}% Risk`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${m.cls}`} title={tip}>
      {m.emoji} {m.label}
    </span>
  );
}

export default function LiveFeedPage() {
  const { showToast } = useToast();
  const supabase = createClient();
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("match");
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [limitInfo, setLimitInfo] = useState<{ plan?: string; used?: number | null; limit?: number | null; limitReached?: boolean; bonus?: number; swapsLeft?: number | null }>({});
  const [savingAll, setSavingAll] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [swappingIds, setSwappingIds] = useState<Set<string>>(new Set());
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [pitchJob, setPitchJob] = useState<FeedJob | null>(null);
  const [pitchResult, setPitchResult] = useState<string | null>(null);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [polling, setPolling] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);

  const PAGE_SIZE = 50;

  const applyDefaults = useCallback((job: any): FeedJob => {
    const str = (v: any): string => (typeof v === "string" ? v : v == null ? "" : String(v));
    const arr = (v: any): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
    return {
      ...job,
      title: str(job.title),
      description: str(job.description),
      budget: str(job.budget),
      client_name: str(job.client_name),
      client_country: str(job.client_country),
      platform: str(job.platform),
      category: str(job.category),
      experience_level: str(job.experience_level),
      skills: arr(job.skills),
      is_saved: !!job.is_saved,
      is_applied: !!job.is_applied,
      matching_score: typeof job.matching_score === "number" ? job.matching_score : null,
      matched_skills: arr(job.matched_skills),
      pitch_id: job.pitch_id ?? null,
      profile_match: typeof job.profile_match === "number" ? job.profile_match : null,
      scam_risk: typeof job.scam_risk === "number" ? job.scam_risk : null,
      scam_level: str(job.scam_level) || null,
      scam_flags: arr(job.scam_flags),
    };
  }, []);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    p.set("sort", sortOrder);
    if (search.trim()) p.set("q", search.trim());
    if (platformFilter !== "all") p.set("platform", platformFilter);
    if (categoryFilter !== "all") p.set("category", categoryFilter);
    if (riskFilter !== "all") p.set("risk", riskFilter);
    return p.toString();
  }, [search, riskFilter, platformFilter, categoryFilter, sortOrder]);

  const loadPage = useCallback(async (mode: "replace" | "append" | "merge") => {
    try {
      if (mode === "replace") setLoading(true);
      if (mode === "append") setLoadingMore(true);
      const off = mode === "append" ? offsetRef.current : 0;
      const countViews = mode === "merge" ? 0 : 1;
      const res = await fetch(`/api/jobs/feed?${buildQuery()}&offset=${off}&count_views=${countViews}`);
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      const mapped: FeedJob[] = (data.jobs ?? []).map(applyDefaults);
      setTotal(data.total ?? 0);
      setHasMore(data.hasMore ?? false);
      setPlatforms(Array.isArray(data.platforms) ? data.platforms : []);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setLimitInfo({ plan: data.plan, used: data.used, limit: data.limit, limitReached: data.limitReached, bonus: data.bonus, swapsLeft: data.swapsLeft });
      if (mode === "append") {
        setJobs((prev: FeedJob[]) => {
          const seen = new Set(prev.map((j) => j.id));
          return [...prev, ...mapped.filter((j) => !seen.has(j.id))];
        });
        offsetRef.current = off + mapped.length;
      } else if (mode === "merge") {
        // refresh the top but keep already-loaded jobs (infinite scroll intact)
        setJobs((prev: FeedJob[]) => {
          const extra = prev.filter((j) => !mapped.some((m) => m.id === j.id));
          return [...mapped, ...extra];
        });
      } else {
        setJobs(mapped);
        offsetRef.current = mapped.length;
      }
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load feed", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [applyDefaults, buildQuery, showToast]);

  // Reload when filters / sort / search change.
  useEffect(() => {
    loadPage("replace");
  }, [loadPage]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Realtime: new global jobs appear automatically. Wrapped in try/catch — on
  // some mobile networks/browsers `new WebSocket()` throws a SecurityError
  // ("operation is insecure") which would otherwise crash the page. The polling
  // fallback below keeps the feed working even when realtime is unavailable.
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase
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
            setNewIds((prev) => new Set(prev).add(job.id));
            setTimeout(() => {
              setNewIds((prev) => {
                const next = new Set(prev);
                next.delete(job.id);
                return next;
              });
            }, 4000);
          }
        );
      channel.subscribe((status: string) => {
        setLive(status === "SUBSCRIBED");
      });
    } catch {
      // WebSocket unavailable (e.g. mobile network blocks it) — polling covers it.
      setLive(false);
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch (_e) {}
      }
    };
  }, [supabase, applyDefaults]);

  // Polling fallback: keep the feed fresh even if the realtime
  // WebSocket is blocked or never reaches SUBSCRIBED.
  useEffect(() => {
    setPolling(true);
    const interval = setInterval(() => {
      loadPage("merge");
    }, 15000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [loadPage]);

  // Infinite scroll: load the next page when the sentinel becomes visible.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadPage("append");
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, loadPage]);

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
      showToast(job.is_saved ? "Removed from saved" : "Saved to My Jobs 💾");
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
    const visible = jobs.filter((j) => !j.is_saved);
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
      showToast(`Saved ${visible.length} job(s) to My Jobs 💾`);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to save jobs", "error");
    } finally {
      setSavingAll(false);
    }
  };

const swapJob = async (job: FeedJob) => {
    // Two-click swap: first click selects the job to trade away, second click
    // picks which other job in the feed to swap it with.
    if (!swapTarget) {
      setSwapTarget(job.id);
      showToast("Selected. Now click Swap on the job you want to trade it with.");
      return;
    }
    if (swapTarget === job.id) {
      setSwapTarget(null);
      showToast("Swap cancelled");
      return;
    }
    setSwappingIds((prev) => new Set(prev).add(job.id));
    try {
      await fetch(`/api/jobs/${swapTarget}/swap`, { method: "POST" });
      const res = await fetch(`/api/jobs/${job.id}/swap`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Swap failed");
      setSwapTarget(null);
      showToast("Jobs swapped 🔄");
      await loadPage("replace");
    } catch (e: any) {
      showToast(e?.message ?? "Swap failed", "error");
    } finally {
      setSwappingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
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
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
              live || polling
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-slate-100 text-slate-400 dark:bg-dark-surface dark:text-slate-500"
            }`}
            title={live ? "Connected — new jobs appear automatically" : polling ? "Auto-refreshing every 15s" : "Connecting to live updates..."}
          >
            <span className={`w-2 h-2 rounded-full ${live || polling ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
            {live || polling ? "LIVE" : "connecting..."}
          </span>
          <Button variant="primary" size="sm" onClick={saveAllVisible} disabled={savingAll || jobs.length === 0}>
            {savingAll ? "Saving..." : "💾 Save Page"}
          </Button>
        </div>
      </div>

      <UpsellAd />

      {/* Tier limit banner */}
      {limitInfo.limitReached ? (
        <div className="bg-kawaii-purple/10 border border-kawaii-purple/40 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-kawaii-purple dark:text-kawaii-lavender">You've reached your daily limit of matching jobs.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">With Pro you get unlimited job views. See you tomorrow! 🎁</p>
          </div>
          <Link href="/pricing"><Button size="sm" variant="primary">Upgrade</Button></Link>
        </div>
      ) : limitInfo.limit != null ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-2xl bg-white/70 dark:bg-dark-card/70 border border-kawaii-lavender/25 dark:border-dark-surface px-3 py-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            You've seen <strong>{limitInfo.used ?? 0}</strong> of <strong>{limitInfo.limit}</strong> matching jobs today
            {limitInfo.bonus ? <> — incl. 🎁 <strong>+{limitInfo.bonus}</strong> bonus</> : null}
            {limitInfo.swapsLeft != null ? <> · 🔄 <strong>{limitInfo.swapsLeft}</strong> swaps left</> : null}
          </span>
          <Link href="/dashboard/wheel" className="text-xs text-kawaii-purple underline">🎡 Claim your daily bonus</Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/70 dark:bg-dark-card/70 border border-kawaii-lavender/25 dark:border-dark-surface px-3 py-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">💎 Unlimited job views (Pro)</span>
        </div>
      )}

      {/* Filters */}
      <Card className="border-kawaii-lavender/30 dark:border-dark-surface">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <Input
            placeholder="🔍 Search feed..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="md:max-w-xs"
          />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full md:w-auto rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
          >
            <option value="all">🛡️ All risk</option>
            <option value="green">🟢 Low</option>
            <option value="yellow">🟡 Medium</option>
            <option value="orange">🟠 Elevated</option>
            <option value="red">🔴 High</option>
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full md:w-auto rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
          >
            <option value="all">🌐 All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-auto rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
          >
            <option value="all">🗂️ All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full md:w-auto rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
          >
            <option value="newest">🆕 Newest</option>
            <option value="match">🎯 Best Match</option>
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
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-4xl mb-3">📡</p>
            <p className="text-slate-400">
              No jobs match the current filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <FeedJobCard
              key={job.id}
              job={job}
              isNew={newIds.has(job.id)}
              saving={savingIds.has(job.id)}
              swapping={swappingIds.has(job.id)}
              swapSelected={swapTarget === job.id}
              swapMode={swapTarget != null}
              generating={generatingId === job.id}
              onToggleSave={() => toggleSave(job)}
              onGeneratePitch={() => generatePitch(job)}
              onSwap={() => swapJob(job)}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll footer */}
      {!loading && (
        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
          {jobs.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {jobs.length} of {total} jobs loaded
            </p>
          )}
          {loadingMore && <span className="text-sm text-slate-400 animate-pulse">Loading more…</span>}
          {!hasMore && jobs.length > 0 && <p className="text-xs text-slate-400">End reached</p>}
          <div ref={sentinelRef} className="h-10" />
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
  isNew,
  saving,
  swapping,
  swapSelected,
  swapMode,
  generating,
  onToggleSave,
  onGeneratePitch,
  onSwap,
}: {
  job: FeedJob;
  isNew: boolean;
  saving: boolean;
  swapping: boolean;
  swapSelected: boolean;
  swapMode: boolean;
  generating: boolean;
  onToggleSave: () => void;
  onGeneratePitch: () => void;
  onSwap: () => void;
}) {
  const grayed = job.clickable === false && !job.locked;
  const locked = !!job.locked;
  const openable = !grayed && !locked;
  return (
    <Card
      className={`flex border-kawaii-lavender/30 dark:border-dark-surface transition-all ${
        isNew ? "ring-2 ring-kawaii-purple/60 bg-kawaii-purple/5 dark:bg-kawaii-purple/10" : ""
      } ${swapSelected ? "ring-2 ring-kawaii-coral/70 bg-kawaii-coral/10 dark:bg-kawaii-coral/10" : ""} ${grayed ? "opacity-45 hover:opacity-60" : "hover:border-kawaii-purple/50"} ${locked ? "opacity-80" : ""}`}
    >
      <CardContent className="p-4 flex flex-col md:flex-row md:items-start gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isNew && (
              <span className="text-xs px-2 py-0.5 bg-kawaii-purple/15 text-kawaii-purple dark:text-kawaii-lavender rounded-full font-bold animate-pulse">
                ✨ NEW
              </span>
            )}
            {grayed && (
              <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full font-bold">
                🎯 Low match
              </span>
            )}
            {locked && (
              <span className="text-xs px-2 py-0.5 bg-kawaii-coral/20 text-kawaii-coral dark:text-kawaii-coral rounded-full font-bold">
                🔒 Daily limit
              </span>
            )}
            {job.category && (
              <Badge variant="secondary" className="bg-kawaii-pink/15 dark:bg-kawaii-pink/20 text-kawaii-pink dark:text-kawaii-pink">
                🗂️ {job.category}
              </Badge>
            )}
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
            {openable ? (
              <Link
                href={`/jobs/${job.id}`}
                className="hover:text-kawaii-purple dark:hover:text-kawaii-lavender transition-colors"
                title="View details on Sari"
              >
                {job.title} <span className="text-xs text-slate-300 dark:text-slate-500">↗</span>
              </Link>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">{job.title}</span>
            )}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            📅 {job.posted_at ? "Posted " + timeAgo(job.posted_at) : "Collected " + timeAgo(job.collected_at)}
            {job.client_name ? ` · 👤 ${job.client_name}${job.client_country ? " (" + job.client_country + ")" : ""}` : ""}
          </p>
          {job.description ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2">
              {job.description}
            </p>
          ) : null}
          {Array.isArray(job.skills) && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.skills.slice(0, 6).map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 bg-kawaii-lavender/20 dark:bg-kawaii-purple/20 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
          {Array.isArray(job.matched_skills) && job.matched_skills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">🎯 Matches:</span>
              {job.matched_skills.slice(0, 6).map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full font-medium">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {job.profile_match != null && (
              <span
                className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-kawaii-purple/10 text-kawaii-purple dark:text-kawaii-lavender"
                title="Deterministic 5-axis profile match"
              >
                🎯 {job.profile_match}%
              </span>
            )}
            {job.scam_level && (
              <ScamBadge level={job.scam_level} risk={job.scam_risk} flags={job.scam_flags} />
            )}
          </div>
          {locked ? (
            <Link href="/pricing">
              <Button size="sm" variant="primary" className="whitespace-nowrap">🔒 Unlock with Money Club</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2 md:flex-col md:items-stretch">
              <Button size="sm" variant={job.is_saved ? "outline" : "primary"} onClick={onToggleSave} disabled={saving || grayed}>
                {saving ? "..." : job.is_saved ? "💾 Saved" : "💾 Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={onGeneratePitch} disabled={generating || grayed}>
                {generating ? "Loading..." : job.pitch_id ? "🚀 View Pitch" : "🚀 Pitch"}
              </Button>
              <Button size="sm" variant="outline" onClick={onSwap} disabled={swapping || grayed || locked} title="Trade this job with another one in the feed">
                {swapping ? "..." : swapSelected ? "Cancel" : swapMode ? "↔ Swap with this" : "🔄 Swap"}
              </Button>
            </div>
          )}
          {job.is_saved && <span className="text-xs text-kawaii-purple dark:text-kawaii-lavender">💾 Saved</span>}
          {job.is_applied && <span className="text-xs text-green-600 dark:text-green-400">✅ Applied</span>}
        </div>
      </CardContent>
    </Card>
  );
}

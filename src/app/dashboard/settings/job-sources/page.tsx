"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";

interface JobSource {
  id: string;
  name: string;
  source_type: "web";
  url: string | null;
  platform: string | null;
  is_active: boolean;
  include_in_live_feed: boolean;
  last_collected_at: string | null;
  created_at: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return "Unknown";
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_BADGE: Record<string, string> = {
  web: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function JobSourcesPage() {
  const { showToast } = useToast();
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Add form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"web">("web");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/job-sources");
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to load job sources", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSource = async (id: string, updates: Record<string, any>, successMsg?: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/job-sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update");
      }
      const data = await res.json();
      setSources((prev) => prev.map((s) => (s.id === id ? data.source : s)));
      if (successMsg) showToast(successMsg);
    } catch (e: any) {
      showToast(e?.message ?? "Failed to update", "error");
    } finally {
      setSavingId(null);
    }
  };

  const addSource = async () => {
    if (!newName.trim()) {
      showToast("Source name is required", "error");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/job-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          source_type: newType,
          url: newUrl.trim(),
          platform: newPlatform.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add source");
      setSources((prev) => [data.source, ...prev]);
      setNewName("");
      setNewUrl("");
      setNewPlatform("");
      showToast("Source added 🎉");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to add source", "error");
    } finally {
      setAdding(false);
    }
  };

  const deleteSource = async (s: JobSource) => {
    if (!window.confirm(`Delete source "${s.name}"? Jobs already collected stay in the feed.`)) return;
    try {
      const res = await fetch(`/api/job-sources/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSources((prev) => prev.filter((x) => x.id !== s.id));
      showToast("Source deleted");
    } catch (e: any) {
      showToast(e?.message ?? "Failed to delete", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl font-extrabold">🛰️ Job Sources</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Sources feed the centralized Live Feed. Web listing pages are scraped by the
          admin collector (Playwright) and pushed into the feed — users don&apos;t scrape anything.
        </p>
      </div>

      {/* Add custom source */}
      <Card className="border-kawaii-purple/20 dark:border-kawaii-purple/30 bg-gradient-to-r from-kawaii-lavender/10 to-kawaii-pink/5 dark:from-dark-surface/30 dark:to-dark-surface/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">➕ Add Custom Source</CardTitle>
          <CardDescription>Add a job listing page URL to scrape.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Upwork Search" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
              >
                <option value="web">Web (listing page)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Platform</Label>
              <Input value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} placeholder="e.g. Upwork" />
            </div>
          </div>
          <Button variant="primary" onClick={addSource} disabled={adding}>
            {adding ? "Adding..." : "➕ Add Source"}
          </Button>
        </CardContent>
      </Card>

      {/* Source list */}
      {loading ? (
        <Card className="animate-pulse">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full bg-kawaii-lavender/30 rounded-xl" />
            ))}
          </CardContent>
        </Card>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-400">
            No job sources yet. Add one above!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => (
            <Card key={s.id} className="border-kawaii-lavender/30 dark:border-dark-surface">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                      <Badge variant="secondary" className={TYPE_BADGE[s.source_type]}>
                        {s.source_type.toUpperCase()}
                      </Badge>
                      {s.platform && (
                        <span className="text-xs text-slate-400">{s.platform}</span>
                      )}
                    </div>
                    {s.url && (
                      <p className="text-xs text-slate-400 truncate mt-0.5 max-w-md">{s.url}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Last collected: <span className="font-medium">{timeAgo(s.last_collected_at)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap shrink-0">
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer" title="Include in Live Feed">
                      <input
                        type="checkbox"
                        checked={s.include_in_live_feed}
                        disabled={savingId === s.id}
                        onChange={(e) =>
                          patchSource(s.id, { include_in_live_feed: e.target.checked }, e.target.checked ? "Included in Live Feed" : "Hidden from Live Feed")
                        }
                        className="rounded border-kawaii-lavender/30 text-kawaii-purple focus:ring-kawaii-purple"
                      />
                      📡 Live Feed
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer" title="Active">
                      <input
                        type="checkbox"
                        checked={s.is_active}
                        disabled={savingId === s.id}
                        onChange={(e) =>
                          patchSource(s.id, { is_active: e.target.checked }, e.target.checked ? "Source activated" : "Source deactivated")
                        }
                        className="rounded border-kawaii-lavender/30 text-kawaii-purple focus:ring-kawaii-purple"
                      />
                      Active
                    </label>
                    <button
                      onClick={() => deleteSource(s)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-500 squishy"
                      title="Delete"
                    >
                      🗑️
                    </button>
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

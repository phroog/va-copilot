"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";

interface Entry {
  id: string;
  domain: string;
  company_name: string;
  description: string;
  risk: "low" | "medium" | "high";
  votes_up: number;
  votes_down: number;
  created_at: string;
}

const RISK: Record<string, { emoji: string; cls: string }> = {
  low: { emoji: "🟢", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  medium: { emoji: "🟡", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  high: { emoji: "🔴", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

export default function ScamDirectoryPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [full, setFull] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  // report form
  const [showForm, setShowForm] = useState(false);
  const [repDomain, setRepDomain] = useState("");
  const [repCompany, setRepCompany] = useState("");
  const [repDesc, setRepDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/scam-registry?q=${encodeURIComponent(search)}`);
      const d = await res.json();
      setEntries(d.entries ?? []);
      setFull(!!d.full);
      setCount(d.count ?? 0);
    } catch {
      showToast("Failed to load scam registry", "error");
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => { load(); }, [load]);

  const submitReport = async () => {
    if (!repDomain.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/scam-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: repDomain, company_name: repCompany, description: repDesc }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Submission failed");
      showToast("Report submitted for review 🛡️");
      setRepDomain(""); setRepCompany(""); setRepDesc("");
      setShowForm(false);
    } catch (e: any) {
      showToast(e?.message || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const vote = async (entry: Entry, v: boolean) => {
    setVoting(entry.id);
    try {
      await fetch("/api/scam-registry/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, vote: v }),
      });
      load();
    } catch {
      showToast("Vote failed", "error");
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">🛡️ Scam Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Community-flagged companies &amp; URLs — reviewed before they become official.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>🚩 Report a scam</Button>
      </div>

      {/* Report form */}
      {showForm && (
        <Card className="animate-slide-up">
          <CardContent className="space-y-3 p-4">
            <Input placeholder="Domain, e.g. scamy-client.com" value={repDomain} onChange={(e) => setRepDomain(e.target.value)} />
            <Input placeholder="Company name (optional)" value={repCompany} onChange={(e) => setRepCompany(e.target.value)} />
            <Input placeholder="Why do you suspect this is a scam? (optional)" value={repDesc} onChange={(e) => setRepDesc(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={submitReport} disabled={submitting || !repDomain.trim()}>
                {submitting ? "Submitting…" : "Submit for review"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="🔍 Search by domain or company…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(q.trim())}
          />
        </CardContent>
      </Card>

      {/* Teaser for Sprout (free) */}
      {!full && !loading && (
        <div className="rounded-2xl border border-kawaii-purple/40 bg-kawaii-purple/10 dark:bg-kawaii-purple/10 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-kawaii-purple dark:text-kawaii-lavender">🔒 {count} companies flagged so far</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Full registry + verification is part of <b>Sari Bloom</b> and <b>Sari Money Club</b>. You're seeing a preview.
            </p>
          </div>
          <Link href="/pricing"><Button size="sm" variant="primary">Unlock</Button></Link>
        </div>
      )}

      {/* List */}
      {loading ? (
        <Card className="animate-pulse"><CardContent className="p-8 h-24" /></Card>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <p className="text-5xl mb-3">🛡️</p>
          <p className="text-slate-400">No entries yet{full ? " — be the first to report!" : " in the preview."}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const r = RISK[entry.risk] || RISK.medium;
            return (
              <Card key={entry.id} className="squishy">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-800 dark:text-slate-100 break-all">{entry.domain}</p>
                      {entry.company_name && <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{entry.company_name}</p>}
                      {entry.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{entry.description}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-bold shrink-0 ${r.cls}`}>{r.emoji} {entry.risk}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => vote(entry, true)} disabled={voting === entry.id} className="text-xs font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200">
                      ▲ {entry.votes_up}
                    </button>
                    <button onClick={() => vote(entry, false)} disabled={voting === entry.id} className="text-xs font-bold px-2 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200">
                      ▼ {entry.votes_down}
                    </button>
                    <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
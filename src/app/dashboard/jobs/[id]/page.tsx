"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScamGauge } from "@/components/scam-gauge";
import Link from "next/link";

interface Milestone {
  id: string;
  job_id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: "todo" | "in_progress" | "done";
  order_index: number;
  created_at: string;
}

interface TimeEntry {
  id: string;
  description: string;
  project_name: string;
  start_time: string;
  end_time: string | null;
  hourly_rate: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  status: string;
  tax_rate: number;
  invoice_items: { total: number }[];
}

function durationHours(entry: TimeEntry): number {
  const start = new Date(entry.start_time).getTime();
  const end = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
  return Math.round(((end - start) / 3600000) * 100) / 100;
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const id = params.id;

  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pitch
  const [pitch, setPitch] = useState("");
  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchRegenerating, setPitchRegenerating] = useState(false);
  const [pitchPolishing, setPitchPolishing] = useState(false);
  const [pitchSaving, setPitchSaving] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);

  // Milestones
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [generatingMilestones, setGeneratingMilestones] = useState(false);

  // Time entries
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Client portal
  const [tokenLink, setTokenLink] = useState("");
  const [generatingToken, setGeneratingToken] = useState(false);

  // Scam check
  const [scamScore, setScamScore] = useState<number | null>(null);
  const [scamAnalysis, setScamAnalysis] = useState("");
  const [scamChecking, setScamChecking] = useState(false);
  const [scamOpen, setScamOpen] = useState(false);

  // Review
  const [reviewLink, setReviewLink] = useState("");
  const [genReview, setGenReview] = useState(false);

  // Score breakdown
  const [breakdown, setBreakdown] = useState<{ label: string; score: number; max: number }[] | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [scoringJob, setScoringJob] = useState(false);

  const load = useCallback(async (id: string) => {
    setJobId(id);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error("Job not found");
      const d = await res.json();
      setJob(d.job);

      fetch(`/api/pitches?jobId=${id}`)
        .then((r) => r.json())
        .then((p) => { if (p.pitch) setPitch(p.pitch); })
        .catch(() => {});

      fetch(`/api/jobs/${id}/milestones`)
        .then((r) => r.json())
        .then((m) => setMilestones(m.milestones ?? []))
        .catch(() => {});

      fetch(`/api/time-entries?job=${id}`)
        .then((r) => r.json())
        .then((te) => setTimeEntries((te.entries ?? []).filter((e: TimeEntry) => e.end_time)))
        .catch(() => {});

      fetch("/api/invoices")
        .then((r) => r.json())
        .then((inv) => setInvoices((inv.invoices ?? []).filter((i: any) => i.job_id === id)))
        .catch(() => {});
    } catch (e) {
      setError((e as any)?.message ?? "Failed to load job");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(id);
  }, [id, load]);

  const statusMilestones = (status: string) => milestones.filter((m) => m.status === status);

  // --- Pitch handlers ---
  const generatePitch = async (force = false) => {
    if (!jobId) return;
    if (force) setPitchRegenerating(true); else setPitchLoading(true);
    try {
      const res = await fetch("/api/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, jobTitle: job?.title, force }),
      });
      const data = await res.json();
      if (res.status === 402) { showToast(data.error, "error"); return; }
      if (data.pitch) {
        setPitch(data.pitch);
        showToast(force ? "Pitch regenerated" : "Pitch generated");
      }
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to generate pitch", "error");
    } finally {
      setPitchLoading(false);
      setPitchRegenerating(false);
    }
  };

  const savePitch = async () => {
    if (!jobId || !pitch.trim()) return;
    setPitchSaving(true);
    try {
      const res = await fetch("/api/pitches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, content: pitch }),
      });
      if (res.ok) showToast("Pitch saved"); else showToast("Failed to save pitch", "error");
    } catch {
      showToast("Failed to save pitch", "error");
    } finally {
      setPitchSaving(false);
    }
  };

  const polishPitch = async () => {
    if (!pitch) return;
    setPitchPolishing(true);
    try {
      const res = await fetch("/api/polish-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pitch }),
      });
      const data = await res.json();
      if (data.polished) setPitch(data.polished);
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to polish text", "error");
    } finally {
      setPitchPolishing(false);
    }
  };

  // --- Milestone handlers ---
  const addMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    const res = await fetch(`/api/jobs/${jobId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newMilestoneTitle.trim(), description: newMilestoneDesc.trim(), due_date: newMilestoneDate || null }),
    });
    const data = await res.json();
    if (res.ok) {
      setMilestones((prev) => [...prev, data.milestone]);
      setNewMilestoneTitle(""); setNewMilestoneDesc(""); setNewMilestoneDate("");
    } else {
      showToast(data.error ?? "Failed to add milestone", "error");
    }
  };

  const updateMilestoneStatus = async (id: string, status: string) => {
    await fetch(`/api/jobs/${jobId}/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, status: status as Milestone["status"] } : m)));
  };

  const deleteMilestone = async (id: string) => {
    if (!confirm("Delete this milestone?")) return;
    await fetch(`/api/jobs/${jobId}/milestones/${id}`, { method: "DELETE" });
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const autoGenerateMilestones = async () => {
    if (!job?.description && !job?.title) { showToast("Job has no description to analyze", "error"); return; }
    setGeneratingMilestones(true);
    try {
      const res = await fetch("/api/generate-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title: job?.title, description: job?.description }),
      });
      const data = await res.json();
      if (res.status === 402) { showToast(data.error, "error"); return; }
      if (data.milestones) {
        showToast(`Generated ${data.milestones.length} milestones!`);
        fetch(`/api/jobs/${jobId}/milestones`).then((r) => r.json()).then((m) => setMilestones(m.milestones ?? []));
      }
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to generate milestones", "error");
    } finally {
      setGeneratingMilestones(false);
    }
  };

  // --- Portal / review / scam handlers ---
  const generateToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await fetch("/api/client-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      const data = await res.json();
      if (data.token) setTokenLink(`${window.location.origin}/portal/${data.token.token}`);
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to generate link", "error");
    } finally {
      setGeneratingToken(false);
    }
  };

  const runScamCheck = async () => {
    setScamChecking(true);
    try {
      const res = await fetch("/api/ai/scam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: job?.client_name || "", website_url: job?.url || "", job_description: job?.description || "" }),
      });
      const data = await res.json();
      if (res.status === 402) { showToast(data.error, "error"); return; }
      setScamScore(data.score);
      setScamAnalysis(data.analysis);
      setScamOpen(true);
    } catch (e) {
      showToast((e as any)?.message ?? "Scam check failed", "error");
    } finally {
      setScamChecking(false);
    }
  };

  const runScore = async () => {
    setScoringJob(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/score`, { method: "POST" });
      const data = await res.json();
      if (data.job) setJob((prev: any) => ({ ...prev, ...data.job }));
      if (data.breakdown) { setBreakdown(data.breakdown); setBreakdownOpen(true); }
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to score job", "error");
    } finally {
      setScoringJob(false);
    }
  };

  const deleteJob = async () => {
    if (!window.confirm(`Delete "${job?.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Job deleted");
        window.location.href = "/dashboard/jobs";
      }
    } catch (e) {
      showToast((e as any)?.message ?? "Failed to delete job", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-2/3 bg-kawaii-lavender/30 rounded-full" />
        <div className="h-40 bg-kawaii-lavender/20 rounded-3xl" />
        <div className="h-40 bg-kawaii-lavender/20 rounded-3xl" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-4xl mb-3">😢</p>
          <p className="text-slate-500">{error || "Job not found"}</p>
          <Link href="/dashboard/jobs" className="inline-block mt-4 text-sm text-kawaii-purple dark:text-kawaii-lavender underline">← Back to jobs</Link>
        </CardContent>
      </Card>
    );
  }

  const totalHours = timeEntries.reduce((s, e) => s + durationHours(e), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/jobs" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">← {t("jobs")}</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold">{job.title}</h1>
        {job.score != null && (
          <button
            onClick={() => setBreakdownOpen(!breakdownOpen)}
            className={`text-sm font-extrabold px-2.5 py-1 rounded-lg squishy ${
              job.score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
              job.score >= 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" :
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
            title="Score breakdown"
          >
            {job.score}
          </button>
        )}
      </div>

      {breakdownOpen && breakdown && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Score Breakdown</p>
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs text-slate-500">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                    <div className={`h-full rounded-full ${item.score >= item.max ? "bg-green-400" : item.score >= item.max * 0.5 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${(item.score / (item.max || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{item.score}/{item.max}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">{job.platform}</Badge>
        {job.budget && <Badge variant="secondary" className="text-xs">💰 {job.budget}</Badge>}
        {job.client_name && <Badge variant="outline" className="text-xs">👤 {job.client_name}</Badge>}
        {job.client_country && <Badge variant="outline" className="text-xs">🌍 {job.client_country}</Badge>}
        {job.client_rating != null && <Badge variant="outline" className="text-xs">⭐ {job.client_rating}</Badge>}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">↗ View Job</Button>
          </a>
        )}
        <Button size="sm" variant="primary" onClick={() => generatePitch(false)} disabled={pitchLoading || pitchRegenerating}>
          {pitchLoading ? "Loading..." : pitch ? "📋 View Pitch" : "🚀 Generate Pitch"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => document.getElementById("milestones")?.scrollIntoView({ behavior: "smooth" })}>📋 Milestones</Button>
        <Link href={`/dashboard/invoices?job=${jobId}`}>
          <Button size="sm" variant="outline">🧾 Create Invoice</Button>
        </Link>
        <Link href={`/dashboard/time-tracker?job=${jobId}`}>
          <Button size="sm" variant="outline">🕐 Track Time</Button>
        </Link>
        <Button size="sm" variant="outline" onClick={runScamCheck} disabled={scamChecking}>{scamChecking ? "⏳" : "🕵️"} Scam Check (1🪙)</Button>
        <Button size="sm" variant="outline" onClick={() => generateToken()} disabled={generatingToken}>{generatingToken ? "⏳" : "🔗"} Client Portal</Button>
        <Button size="sm" variant="outline" onClick={async () => {
          setGenReview(true);
          try {
            const res = await fetch(`/api/jobs/${jobId}/request-review`, { method: "POST" });
            const data = await res.json();
            if (data.token) setReviewLink(`${window.location.origin}/review/${data.token.token}`);
          } catch (e) {
            showToast((e as any)?.message ?? "Failed to generate review link", "error");
          } finally { setGenReview(false); }
        }} disabled={genReview}>{genReview ? "⏳" : "⭐"} Request Review</Button>
        <Button size="sm" variant="outline" onClick={runScore} disabled={scoringJob}>{scoringJob ? "..." : "🎯"} Score</Button>
        <Button size="sm" variant="ghost" className="text-red-500" onClick={deleteJob}>🗑️ Delete</Button>
      </div>

      {/* Job details + time stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">📋 {t("jobDetails")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {job.budget_type && <><span className="text-slate-500">Budget Type</span><span className="font-medium">{job.budget_type}</span></>}
            {job.budget_amount && <><span className="text-slate-500">Budget Amount</span><span className="font-medium">{job.budget_amount}</span></>}
            {job.client_total_spent && <><span className="text-slate-500">Client Total Spent</span><span className="font-medium">{job.client_total_spent}</span></>}
            {job.client_email && <><span className="text-slate-500">Client Email</span><span className="font-medium">{job.client_email}</span></>}
            {job.client_address && <><span className="text-slate-500">Client Address</span><span className="font-medium">{job.client_address}</span></>}
            {job.match_reason && <><span className="text-slate-500">Match</span><span className="font-medium">🎯 {job.match_reason}</span></>}
            {job.skills?.length > 0 && (
              <div className="col-span-2">
                <span className="text-slate-500 block mb-1">Skills</span>
                <div className="flex flex-wrap gap-1">
                  {job.skills.map((s: string) => <span key={s} className="text-xs px-2 py-0.5 bg-kawaii-lavender/20 dark:bg-kawaii-purple/20 rounded-full">{s}</span>)}
                </div>
              </div>
            )}
          </CardContent>
          {job.description && (
            <CardContent className="pt-0 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{job.description}</CardContent>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">⏱ Tracked Time</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender">{totalHours.toFixed(2)}h</p>
            <p className="text-xs text-slate-400 mb-3">{timeEntries.length} completed session{timeEntries.length === 1 ? "" : "s"}</p>
            {timeEntries.length === 0 ? (
              <p className="text-sm text-slate-400">No tracked time yet.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {timeEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm p-2 rounded-xl bg-kawaii-lavender/10 dark:bg-dark-surface/50">
                    <div className="min-w-0">
                      <p className="text-slate-700 dark:text-slate-200 truncate text-xs">{e.description || e.project_name || "Work session"}</p>
                      <p className="text-xs text-slate-400">{new Date(e.start_time).toLocaleDateString()}</p>
                    </div>
                    <span className="font-bold text-sm">{durationHours(e).toFixed(2)}h</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pitch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">🚀 Pitch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={pitch} onChange={(e) => setPitch(e.target.value)} rows={10} placeholder="Generate or write your pitch here..." className="text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => generatePitch(false)} disabled={pitchLoading}>{pitchLoading ? "Loading..." : pitch ? "🔄 Refresh" : "🚀 Generate"}</Button>
            <Button size="sm" variant="outline" onClick={() => generatePitch(true)} disabled={pitchRegenerating}>{pitchRegenerating ? "Regenerating..." : "🔄 Regenerate (1🪙)"}</Button>
            <Button size="sm" variant="outline" onClick={polishPitch} disabled={pitchPolishing || !pitch}>{pitchPolishing ? "Polishing..." : "✨ Polish English"}</Button>
            <Button size="sm" variant="outline" onClick={savePitch} disabled={pitchSaving || !pitch.trim()}>{pitchSaving ? "Saving..." : "💾 Save"}</Button>
            <Button size="sm" variant="outline" onClick={() => { if (pitch) { navigator.clipboard.writeText(pitch); setPitchCopied(true); setTimeout(() => setPitchCopied(false), 1500); } }}>📋 {pitchCopied ? "Copied!" : "Copy"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card id="milestones">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">📋 Milestones</CardTitle>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">{statusMilestones("todo").length} Todo</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{statusMilestones("in_progress").length} In Progress</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{statusMilestones("done").length} Done</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-kawaii-lavender/10 dark:bg-dark-surface/30 rounded-xl">
            <Input value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)} placeholder="Milestone title" className="flex-1" />
            <Input value={newMilestoneDesc} onChange={(e) => setNewMilestoneDesc(e.target.value)} placeholder="Description (optional)" className="flex-1" />
            <Input type="date" value={newMilestoneDate} onChange={(e) => setNewMilestoneDate(e.target.value)} className="w-40" />
            <Button size="sm" variant="primary" onClick={addMilestone} disabled={!newMilestoneTitle.trim()}>➕ Add</Button>
            <Button size="sm" variant="outline" onClick={autoGenerateMilestones} disabled={generatingMilestones} title="Auto-generate milestones from job description (1 credit)">
              {generatingMilestones ? "⏳" : "🤖"} Auto
            </Button>
          </div>
          {milestones.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No milestones yet. Add your first one!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["todo", "in_progress", "done"] as const).map((col) => (
                <div key={col} className={`rounded-xl p-3 ${col === "todo" ? "bg-yellow-50 dark:bg-yellow-900/10" : col === "in_progress" ? "bg-blue-50 dark:bg-blue-900/10" : "bg-green-50 dark:bg-green-900/10"}`}>
                  <p className="text-xs font-bold mb-2 uppercase tracking-wider text-slate-600 dark:text-slate-300">{col.replace("_", " ")}</p>
                  <div className="space-y-2">
                    {statusMilestones(col).map((m) => (
                      <div key={m.id} className="bg-white dark:bg-dark-card rounded-lg p-3 border border-kawaii-lavender/20 dark:border-dark-surface/50 shadow-sm">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words flex-1">{m.title}</p>
                          <button onClick={() => deleteMilestone(m.id)} className="text-slate-300 hover:text-red-500 shrink-0 text-xs">🗑️</button>
                        </div>
                        {m.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.description}</p>}
                        {m.due_date && <p className="text-xs text-slate-400 mt-1">📅 {m.due_date}</p>}
                        <button
                          onClick={() => updateMilestoneStatus(m.id, m.status === "todo" ? "in_progress" : m.status === "in_progress" ? "done" : "todo")}
                          className="mt-2 w-full text-xs px-2 py-1 rounded-full font-medium transition-all squishy bg-kawaii-lavender/20 hover:bg-kawaii-lavender/40 text-kawaii-purple dark:bg-dark-surface/50 dark:hover:bg-dark-surface"
                        >
                          {m.status === "todo" ? "▶ Start" : m.status === "in_progress" ? "✅ Complete" : "🔄 Redo"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">📄 Invoices</CardTitle>
            <Link href={`/dashboard/invoices?job=${jobId}`}>
              <Button size="sm" variant="primary">➕ Create Invoice</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-400">No invoices for this job yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const sub = (inv.invoice_items ?? []).reduce((s, i) => s + Number(i.total || 0), 0);
                const total = sub + sub * (Number(inv.tax_rate) / 100);
                return (
                  <Link key={inv.id} href={`/dashboard/invoices`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-kawaii-lavender/10 dark:bg-dark-surface/50 hover:bg-kawaii-lavender/20 transition-all">
                      <div>
                        <p className="text-sm font-semibold">{inv.invoice_number}</p>
                        <p className="text-xs text-slate-400">{inv.issue_date}{inv.due_date ? ` — Due ${inv.due_date}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          inv.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                          inv.status === "sent" ? "bg-kawaii-lavender/30 text-kawaii-purple dark:text-kawaii-lavender" :
                          "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span>
                        <p className="text-sm font-bold mt-1">${total.toFixed(2)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client portal */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2">🔗 {t("clientPortal")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-3">{t("clientPortalDesc")}</p>
          {tokenLink ? (
            <div className="flex items-center gap-2">
              <Input value={tokenLink} readOnly className="text-sm font-mono" />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(tokenLink); showToast("Link copied"); }}>📋</Button>
            </div>
          ) : (
            <Button size="sm" variant="primary" onClick={generateToken} disabled={generatingToken}>{generatingToken ? "Generating..." : "🔗 " + t("generateLink")}</Button>
          )}
        </CardContent>
      </Card>

      {/* Review link */}
      {reviewLink && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2">⭐ Review Link</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={reviewLink} readOnly className="text-sm font-mono" />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(reviewLink); showToast("Link copied"); }}>📋</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scam dialog */}
      <Dialog open={scamOpen} onOpenChange={setScamOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>🕵️ Scam Check Result</DialogTitle>
            <DialogDescription>Trust score for this client</DialogDescription>
          </DialogHeader>
          {scamScore !== null && (
            <div className="flex flex-col items-center gap-4 py-4">
              <ScamGauge score={scamScore} />
              {scamScore < 50 && (
                <div className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 font-medium">
                  ⚠️ Scam warning — this client has a low trust score
                </div>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">{scamAnalysis}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

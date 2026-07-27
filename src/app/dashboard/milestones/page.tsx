"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";

interface Job {
  id: string;
  title: string;
  platform: string;
}

interface Milestone {
  id: string;
  job_id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: "todo" | "in_progress" | "done";
  order_index: number;
  created_at: string;
  jobs: { title: string; platform: string } | null;
}

const statusColors: Record<string, string> = {
  todo: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const statusEmojis: Record<string, string> = {
  todo: "📋",
  in_progress: "🔄",
  done: "✅",
};

const filters = ["all", "todo", "in_progress", "done"];

export default function MilestonesPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newJobId, setNewJobId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMilestones();
    fetch("/api/jobs").then(r => r.ok && r.json()).then(d => setJobs(d.jobs ?? [])).catch(() => {});
  }, []);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/milestones");
      const data = await res.json();
      setMilestones(data.milestones ?? []);
    } catch {} finally { setLoading(false); }
  };

  const createMilestone = async () => {
    if (!newTitle.trim()) { showToast("Title is required"); return; }
    if (!newJobId) { showToast("Please select a job"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim(), due_date: newDate || null, job_id: newJobId || null }),
      });
      if (res.ok) {
        setNewTitle(""); setNewDesc(""); setNewDate(""); setNewJobId("");
        showToast("Milestone created!");
        fetchMilestones();
      }
    } catch {} finally { setCreating(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchMilestones();
  };

  const deleteMilestone = async (id: string) => {
    if (!confirm("Delete this milestone?")) return;
    await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    fetchMilestones();
  };

  const filtered = filter === "all" ? milestones : milestones.filter(m => m.status === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">📋 Milestones</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">✨ New Milestone</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
            <div className="flex flex-wrap gap-2">
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-40" />
              <select
                value={newJobId}
                onChange={e => setNewJobId(e.target.value)}
                className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-xl border border-input bg-transparent"
              >
                <option value="">Select a job...</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <Button size="sm" onClick={createMilestone} disabled={creating || !newTitle.trim() || !newJobId}>
                {creating ? "Creating..." : "➕ Add"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors squishy ${
              filter === f
                ? "bg-kawaii-lavender/30 text-kawaii-purple dark:text-kawaii-lavender"
                : "bg-slate-100 dark:bg-dark-surface text-slate-500 dark:text-slate-400 hover:bg-kawaii-lavender/20"
            }`}
          >
            {f === "all" ? "All" : `${statusEmojis[f]} ${f.replace("_", " ")}`}
            {f !== "all" && ` (${milestones.filter(m => m.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="text-center py-8 text-slate-400">No milestones yet. Create one above!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(m => (
            <Card key={m.id} className={`border-l-4 ${m.status === "done" ? "border-l-green-400" : m.status === "in_progress" ? "border-l-blue-400" : "border-l-slate-300"}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[m.status]}`}>
                        {statusEmojis[m.status]} {m.status.replace("_", " ")}
                      </span>
                      {m.jobs && (
                        <Badge variant="outline" className="text-xs">{m.jobs.title}</Badge>
                      )}
                      {m.due_date && (
                        <span className="text-xs text-slate-400">
                          📅 {new Date(m.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 mt-1">{m.title}</p>
                    {m.description && <p className="text-sm text-slate-500 mt-0.5">{m.description}</p>}
                  </div>
                  <div className="relative">
                    <button onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 squishy px-1">⋯</button>
                    {menuOpen === m.id && (
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-white dark:bg-dark-card border border-kawaii-lavender/20 dark:border-dark-surface rounded-xl shadow-xl py-1">
                        {m.status !== "todo" && <button onClick={() => { updateStatus(m.id, "todo"); setMenuOpen(null); }} className="w-full text-left px-3.5 py-2 text-sm hover:bg-kawaii-lavender/10 dark:hover:bg-kawaii-purple/20">📋 Todo</button>}
                        {m.status !== "in_progress" && <button onClick={() => { updateStatus(m.id, "in_progress"); setMenuOpen(null); }} className="w-full text-left px-3.5 py-2 text-sm hover:bg-kawaii-lavender/10 dark:hover:bg-kawaii-purple/20">🔄 In Progress</button>}
                        {m.status !== "done" && <button onClick={() => { updateStatus(m.id, "done"); setMenuOpen(null); }} className="w-full text-left px-3.5 py-2 text-sm hover:bg-kawaii-lavender/10 dark:hover:bg-kawaii-purple/20">✅ Done</button>}
                        <hr className="my-1 border-kawaii-lavender/20 dark:border-dark-surface" />
                        <button onClick={() => { deleteMilestone(m.id); setMenuOpen(null); }} className="w-full text-left px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">🗑️ Delete</button>
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

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n/context";

interface TimeEntry {
  id: string;
  description: string;
  project_name: string;
  start_time: string;
  end_time: string | null;
  hourly_rate: number;
  job_id?: string | null;
}

interface JobOption {
  id: string;
  title: string;
  platform: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getEntryDurationSeconds(entry: TimeEntry): number {
  const start = new Date(entry.start_time).getTime();
  const end = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
  return Math.floor((end - start) / 1000);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function getDateLabel(iso: string): string {
  const d = new Date(iso).toDateString();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (d === today) return "Today";
  if (d === yesterday) return "Yesterday";
  return formatDate(iso);
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

  export default function TimeTrackerPage() {
  const { t } = useLocale();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [desc, setDesc] = useState("");
  const [project, setProject] = useState("");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [projects, setProjects] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualProject, setManualProject] = useState("");
  const [manualRate, setManualRate] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editRate, setEditRate] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [manualJobId, setManualJobId] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load event from query param for event linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("eventId");
    if (eventId) {
      fetch(`/api/events?start=2000-01-01&end=2099-12-31`)
        .then((r) => r.json())
        .then((data) => {
          const ev = (data.events ?? []).find((e: any) => e.id === eventId);
          if (ev) {
            setDesc(ev.title);
            if (ev.job_id) setSelectedJobId(ev.job_id);
            if (ev.jobs?.title) setProject(ev.jobs.title);
            setEventId(eventId);
          }
        })
        .catch(() => {});
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setApiError(null);
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      if (filterProject) params.set("project", filterProject);
      const res = await fetch(`/api/time-entries?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) { setApiError(data.error ?? "Failed to load entries"); return; }
      setEntries(data.entries ?? []);
      setRunning(data.running ?? null);
      const uniqueProjects = Array.from(new Set((data.entries ?? []).map((e: TimeEntry) => e.project_name).filter(Boolean))) as string[];
      setProjects(uniqueProjects);
    } catch (e: any) {
      setApiError(e?.message ?? "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load default rate
  useEffect(() => {
    fetch("/api/user-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.default_hourly_rate) setHourlyRate(String(data.settings.default_hourly_rate));
      })
      .catch(() => {});
  }, []);

  // Load jobs for linking
  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => {});
  }, []);

  // Live elapsed timer
  useEffect(() => {
    if (running) {
      const update = () => {
        const start = new Date(running.start_time).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      };
      update();
      intervalRef.current = setInterval(update, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      setElapsed(0);
    }
  }, [running]);

  const startTimer = async () => {
    try {
      setApiError(null);
      const rate = parseFloat(hourlyRate) || 0;
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          project_name: project,
          start_time: new Date().toISOString(),
          hourly_rate: rate,
          job_id: selectedJobId || null,
          event_id: eventId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error ?? "Failed to start timer"); return; }
      if (data.entry) {
        setRunning(data.entry);
        setDesc("");
      }
    } catch (e: any) {
      setApiError(e?.message ?? "Failed to start timer");
    }
  };

  const stopTimer = async () => {
    if (!running) return;
    try {
      setApiError(null);
      const res = await fetch(`/api/time-entries/${running.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_time: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error ?? "Failed to stop timer"); return; }
      if (data.entry) {
        setRunning(null);
        fetchData();
      }
    } catch (e: any) {
      setApiError(e?.message ?? "Failed to stop timer");
    }
  };

  const addManualEntry = async () => {
    if (!manualStart) return;
    try {
      setApiError(null);
      const start = new Date(manualStart).toISOString();
      const end = manualEnd ? new Date(manualEnd).toISOString() : undefined;
      const rate = parseFloat(manualRate) || 0;
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: manualDesc,
          project_name: manualProject,
          start_time: start,
          end_time: end,
          hourly_rate: rate,
          job_id: manualJobId || null,
          event_id: eventId || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setApiError(d.error ?? "Failed to add entry"); return; }
      setManualStart("");
      setManualEnd("");
      setManualDesc("");
      setManualProject("");
      setManualRate("0");
      setShowManual(false);
      fetchData();
    } catch (e: any) {
      setApiError(e?.message ?? "Failed to add entry");
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      setApiError(null);
      const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setApiError(d.error ?? "Failed to delete entry"); return; }
      fetchData();
    } catch (e: any) {
      setApiError(e?.message ?? "Failed to delete entry");
    }
  };

  const saveEdit = async (id: string) => {
    try {
      setApiError(null);
      const res = await fetch(`/api/time-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDesc, project_name: editProject, hourly_rate: parseFloat(editRate) || 0 }),
      });
      if (!res.ok) { const d = await res.json(); setApiError(d.error ?? "Failed to save"); return; }
      setEditingId(null);
      fetchData();
    } catch (e: any) {
      setApiError(e?.message ?? "Failed to save");
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams({ export: "csv" });
    if (filterDate) params.set("date", filterDate);
    if (filterProject) params.set("project", filterProject);
    window.open(`/api/time-entries?${params.toString()}`, "_blank");
  };

  // Group entries by date
  const grouped: Record<string, TimeEntry[]> = {};
  entries.forEach((e) => {
    const key = new Date(e.start_time).toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const todayEarnings = entries
    .filter((e) => isSameDay(e.start_time, new Date().toISOString()))
    .reduce((sum, e) => {
      const secs = getEntryDurationSeconds(e);
      return sum + (secs / 3600) * e.hourly_rate;
    }, 0);

  const todayHours = entries
    .filter((e) => isSameDay(e.start_time, new Date().toISOString()))
    .reduce((sum, e) => sum + getEntryDurationSeconds(e), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">⏱ {t("timeTracker")}</h1>

      {apiError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Running Timer */}
      <Card className={`bg-gradient-to-r ${running ? "from-kawaii-pink/20 to-kawaii-purple/20 dark:from-kawaii-pink/10 dark:to-kawaii-purple/10" : "from-kawaii-lavender/20 to-kawaii-peach/10 dark:from-kawaii-lavender/10 dark:to-kawaii-peach/5"}`}>
        <CardContent className="p-6">
          {running ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-bold text-red-500">RUNNING</span>
              </div>
              <p className="text-5xl font-extrabold bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent tabular-nums">
                {formatDuration(elapsed)}
              </p>
              <p className="text-lg font-semibold mt-2 text-slate-700 dark:text-slate-200">
                {running.description || "(no description)"}
              </p>
              {running.project_name && (
                <Badge variant="outline" className="mt-1">{running.project_name}</Badge>
              )}
              <div className="flex justify-center gap-3 mt-4">
                <Button variant="destructive" size="lg" onClick={stopTimer} className="text-lg px-8">
                  ⏹ Stop
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <div className="flex-1">
                  <Label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                    📝 {t("description")}
                  </Label>
                  <Input
                    placeholder={t("timerPlaceholder")}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startTimer()}
                  />
                </div>
                <div className="sm:w-40">
                  <Label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                    📁 {t("project")}
                  </Label>
                  <Input
                    placeholder={t("projectPlaceholder")}
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    list="projects"
                  />
                  <datalist id="projects">
                    {projects.map((p) => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <div className="sm:w-32">
                  <Label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                    💰 {t("hourlyRate")}
                  </Label>
                  <Input
                    type="number"
                    placeholder="$/hr"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>
                {jobs.length > 0 && (
                  <div className="sm:w-44">
                    <Label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                      🔗 {t("linkJob")}
                    </Label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => { setSelectedJobId(e.target.value); if (e.target.value) { const j = jobs.find(j => j.id === e.target.value); if (j) setProject(j.title); } }}
                      className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple focus-visible:ring-offset-2"
                    >
                      <option value="">— {t("noJobLinked")} —</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>{j.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <Button variant="primary" size="lg" onClick={startTimer} className="w-full sm:w-auto">
                ▶ {t("start")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-44"
          />
          <Input
            placeholder="📁 Filter project"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-44"
          />
          {(filterDate || filterProject) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterDate(""); setFilterProject(""); }}>
              ✕ Clear
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowManual(!showManual)}>
            📝 {t("manualEntry")}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            📥 {t("exportCsv")}
          </Button>
        </div>
      </div>

      {/* Manual Entry */}
      {showManual && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-lg">📝 {t("manualEntry")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("description")}</Label>
                <Input value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder={t("timerPlaceholder")} />
              </div>
              <div>
                <Label className="text-xs">{t("project")}</Label>
                <Input value={manualProject} onChange={(e) => setManualProject(e.target.value)} placeholder={t("projectPlaceholder")} />
              </div>
              <div>
                <Label className="text-xs">{t("startTime")}</Label>
                <Input type="datetime-local" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t("endTime")}</Label>
                <Input type="datetime-local" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">{t("hourlyRate")} ($/hr)</Label>
                <Input type="number" value={manualRate} onChange={(e) => setManualRate(e.target.value)} placeholder="0" />
              </div>
              {jobs.length > 0 && (
                <div>
                  <Label className="text-xs">{t("linkJob")}</Label>
                  <select
                    value={manualJobId}
                    onChange={(e) => { setManualJobId(e.target.value); if (e.target.value) { const j = jobs.find(j => j.id === e.target.value); if (j) setManualProject(j.title); } }}
                    className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple focus-visible:ring-offset-2"
                  >
                    <option value="">— {t("noJobLinked")} —</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={addManualEntry} disabled={!manualStart}>
                💾 {t("save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowManual(false)}>{t("cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today summary */}
      {!filterDate && !filterProject && (
        <Card className="bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/5 dark:to-kawaii-pink/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("todaySummary")}</p>
                <p className="text-lg font-extrabold text-slate-700 dark:text-slate-200">
                  {t("totalHours")}: {formatDuration(todayHours)} — {t("totalEarnings")}: ${todayEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped entries */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-5xl mb-3">⏳</p>
            <p className="text-slate-400">{t("noTimeEntries")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, dayEntries]) => {
            const daySecs = dayEntries.reduce((s, e) => s + getEntryDurationSeconds(e), 0);
            const dayEarnings = dayEntries.reduce((s, e) => s + (getEntryDurationSeconds(e) / 3600) * e.hourly_rate, 0);
            return (
              <div key={dateKey}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">
                    {getDateLabel(dayEntries[0].start_time)}
                  </h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {formatDuration(daySecs)} · ${dayEarnings.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayEntries.map((entry) => {
                    const secs = getEntryDurationSeconds(entry);
                    const amount = (secs / 3600) * entry.hourly_rate;
                    const isEditing = editingId === entry.id;
                    return (
                      <Card key={entry.id} className="squishy">
                        <CardContent className="p-4">
                          {isEditing ? (
                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                              <div className="flex-1">
                                <Input size={1} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="text-sm" />
                              </div>
                              <div className="sm:w-32">
                                <Input size={1} value={editProject} onChange={(e) => setEditProject(e.target.value)} placeholder={t("project")} className="text-sm" />
                              </div>
                              <div className="sm:w-24">
                                <Input type="number" size={1} value={editRate} onChange={(e) => setEditRate(e.target.value)} className="text-sm" />
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="primary" onClick={() => saveEdit(entry.id)}>💾</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>✕</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {formatTime(entry.start_time)}
                                    {entry.end_time ? ` – ${formatTime(entry.end_time)}` : " – now"}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {formatDuration(secs)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                                  {entry.description || "(no description)"}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {entry.project_name && (
                                    <Badge variant="secondary" className="text-xs">{entry.project_name}</Badge>
                                  )}
                                  <span className="text-xs text-kawaii-purple dark:text-kawaii-lavender font-medium">
                                    ${entry.hourly_rate}/hr · ${amount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setEditingId(entry.id); setEditDesc(entry.description); setEditProject(entry.project_name); setEditRate(String(entry.hourly_rate)); }}
                                >
                                  ✏️
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteEntry(entry.id)}>
                                  🗑️
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

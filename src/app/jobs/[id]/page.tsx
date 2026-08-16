"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const SCAM_META: Record<string, { emoji: string; label: string; cls: string }> = {
  green: { emoji: "🟢", label: "Gering", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  yellow: { emoji: "🟡", label: "Mittel", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  orange: { emoji: "🟠", label: "Erhöht", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  red: { emoji: "🔴", label: "Hoch", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

export default function GlobalJobDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [revealMsg, setRevealMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { id: jobId } = await params;
      setId(jobId);
      try {
        const res = await fetch(`/api/jobs/global/${jobId}`);
        if (!res.ok) { setError("Job nicht gefunden"); return; }
        const data = await res.json();
        setJob(data.job);
      } catch { setError("Laden fehlgeschlagen"); } finally { setLoading(false); }
    })();
  }, [params]);

  const reveal = async () => {
    if (!id) return;
    setRevealing(true);
    setRevealMsg(null);
    try {
      const res = await fetch(`/api/jobs/global/${id}/reveal`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRevealMsg({ type: "err", text: data?.error || "Fehlgeschlagen (Credits?)" });
        return;
      }
      setRevealMsg({ type: "ok", text: "Link freigeschaltet – wird geöffnet …" });
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setRevealMsg({ type: "err", text: "Netzwerkfehler" });
    } finally { setRevealing(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center"><p className="text-slate-400 animate-pulse">Lade Job…</p></div>;

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center p-4">
        <Card><CardContent className="p-8 text-center">
          <p className="text-4xl mb-3">😢</p>
          <p className="text-slate-500">{error || "Job nicht gefunden"}</p>
          <Link href="/dashboard/live-feed" className="inline-block mt-4 text-sm text-kawaii-purple underline">← Zurück zum Feed</Link>
        </CardContent></Card>
      </div>
    );
  }

  const scam = SCAM_META[job.scam_level] || SCAM_META.green;

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <Link href="/dashboard/live-feed" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">← Zurück zum Feed</Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {job.platform && <Badge variant="outline" className="text-xs">{job.platform}</Badge>}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${scam.cls}`}>{scam.emoji} {scam.label} ({job.scam_risk}%)</span>
              {job.profile_match != null && (
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-kawaii-purple/10 text-kawaii-purple dark:text-kawaii-lavender" title="5-Achsen-Match">🎯 {job.profile_match}%</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">{job.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {job.budget && <Badge variant="secondary" className="text-xs">💰 {job.budget}</Badge>}
              {job.experience_level && <Badge variant="outline" className="text-xs">{job.experience_level}</Badge>}
              {job.posted_at && <span className="text-xs text-slate-400">📅 {new Date(job.posted_at).toLocaleDateString()}</span>}
              {job.client_name && <Badge variant="outline" className="text-xs">👤 {job.client_name}</Badge>}
            </div>
            {Array.isArray(job.skills) && job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {job.skills.slice(0, 8).map((s: string) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface text-slate-600 dark:text-slate-300">{s}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-500 mb-3">Beschreibung</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {job.description || "Keine Beschreibung vorhanden."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-200">🔗 Original-Link freischalten</p>
              <p className="text-xs text-slate-400 mt-1">Kostet 1 Credit — Details oben sind kostenlos.</p>
            </div>
            <Button onClick={reveal} disabled={revealing}>
              {revealing ? "Öffne…" : "🔗 Original öffnen (1🪙)"}
            </Button>
          </CardContent>
          {revealMsg && (
            <CardContent className="pt-0">
              <p className={`text-sm ${revealMsg.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{revealMsg.text}</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
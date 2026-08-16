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
  const [enrich, setEnrich] = useState<{ state: "idle" | "loading" | "ok" | "err"; text?: string }>({ state: "idle" });

  useEffect(() => {
    (async () => {
      const { id: jobId } = await params;
      setId(jobId);
      try {
        const res = await fetch(`/api/jobs/global/${jobId}`);
        if (!res.ok) { setError("Job nicht gefunden"); return; }
        const data = await res.json();
        setJob(data.job);
        // If no enriched detail is cached yet, ask the extension to fetch it
        // live from the platform (via the bridge), then cache it.
        if (!data.job?.detail) requestDetail(jobId);
      } catch { setError("Laden fehlgeschlagen"); } finally { setLoading(false); }
    })();
  }, [params]);

  function extId() {
    try { return window.localStorage.getItem("sari_ext_id"); } catch { return null; }
  }

  function openOriginal() {
    const eid = extId();
    const c = (window as any).chrome;
    if (eid && c && c.runtime) {
      c.runtime.sendMessage(eid, { type: "OPEN_JOB_BY_ID", id }).catch(() => {});
    } else {
      window.postMessage({ type: "SARI_OPEN_JOB", id }, "*");
    }
  }

  function requestDetail(jobId: string) {
    const requestId = "d" + Date.now();
    setEnrich({ state: "loading", text: "Lade Details über die Extension…" });
    const onResult = (m: any) => {
      if (m.ok && m.detail) {
        setJob((prev: any) => ({ ...prev, detail: m.detail }));
        setEnrich({ state: "ok" });
        fetch(`/api/jobs/global/${jobId}/detail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ detail: m.detail }),
        }).catch(() => {});
      } else {
        setEnrich({ state: "err", text: m.error || "Details nicht abrufbar" });
      }
    };
    const done = () => {
      window.removeEventListener("message", onBridge);
      setEnrich((e) => (e.state === "loading" ? { state: "err", text: "Extension nicht erreichbar – ist die Scanner-Extension geladen & eingestellt (Extension-ID)?" } : e));
    };
    const timeout = setTimeout(done, 12000);
    const onBridge = (event: MessageEvent) => {
      const m = event.data || {};
      if (m.type !== "SARI_FETCH_DETAIL_RESULT" || m.requestId !== requestId) return;
      clearTimeout(timeout);
      window.removeEventListener("message", onBridge);
      onResult(m);
    };
    window.addEventListener("message", onBridge);

    // Prefer direct messaging (externally_connectable); fall back to the bridge.
    const eid = extId();
    const c = (window as any).chrome;
    if (eid && c && c.runtime) {
      c.runtime
        .sendMessage(eid, { type: "FETCH_DETAIL_BY_ID", id: jobId })
        .then((resp: any) => { clearTimeout(timeout); window.removeEventListener("message", onBridge); onResult({ ok: !!(resp && resp.ok), detail: resp && resp.detail, error: resp && resp.error }); })
        .catch(() => { window.postMessage({ type: "SARI_FETCH_DETAIL", id: jobId, requestId }, "*"); });
    } else {
      window.postMessage({ type: "SARI_FETCH_DETAIL", id: jobId, requestId }, "*");
    }
  }

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
              {(job.detail?.description || job.description || "Keine Beschreibung vorhanden.")}
            </p>
            {enrich.state === "loading" && <p className="text-xs text-slate-400 mt-2 animate-pulse">🔍 {enrich.text}</p>}
            {enrich.state === "err" && <p className="text-xs text-red-500 mt-2">⚠️ {enrich.text}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-200">🔗 Original ansehen (Link versteckt)</p>
              <p className="text-xs text-slate-400 mt-1">Öffnet die echte Seite ohne sichtbaren Link. Link freischalten: 1 Credit.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openOriginal} title="Original-Seite in verstecktem Fenster öffnen">
                🔍 Original ansehen
              </Button>
              <Button onClick={reveal} disabled={revealing}>
                {revealing ? "Öffne…" : "🔗 Link freischalten (1🪙)"}
              </Button>
            </div>
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
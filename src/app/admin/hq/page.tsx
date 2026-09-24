"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HqData {
  generated_at: string;
  counts: { signups: number; purchases: number; letters: number; scams: number; leads: number; messages: number };
  signups: { user_id: string; name: string | null; email: string | null; created_at: string; phone: string | null; skills: string[] | null; goal: string | null; job_vector: number[] | null }[];
  purchases: { id: string; email: string | null; plan: string; status: string; current_period_end: string | null; created_at: string }[];
  letters: { id: string; email: string | null; category: string; urgency: string; message: string; status: string; created_at: string }[];
  scams: { id: string; domain: string; company_name: string; risk: string; status: string; reporter: string | null; created_at: string }[];
  leads: { id: string; email: string; whatsapp: string | null; path: string | null; persona: string | null; plan: string | null; created_at: string }[];
  messages: { id: string; recipient: string; sender_name: string; title: string; body: string; created_at: string }[];
}

const URGENCY: Record<string, { emoji: string; cls: string }> = {
  low: { emoji: "🌱", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  medium: { emoji: "🔶", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  high: { emoji: "🔺", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  urgent: { emoji: "🚨", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const RISK: Record<string, { emoji: string; cls: string }> = {
  low: { emoji: "🟢", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  medium: { emoji: "🟡", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  high: { emoji: "🔴", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

function fmt(d: string | null) {
  if (!d) return "—";
  const x = new Date(d);
  return isNaN(x.getTime()) ? d : x.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminHq() {
  const router = useRouter();
  const [data, setData] = useState<HqData | null>(null);
  const [loading, setLoading] = useState(true);

  // message composer
  const [recipient, setRecipient] = useState("all");
  const [senderName, setSenderName] = useState("Sari Team");
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hq");
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const sendMessage = async () => {
    if (!msgTitle.trim() || !msgBody.trim() || !senderName.trim()) {
      setSent("⚠️ sender, title and message are required");
      return;
    }
    setSending(true);
    setSent("");
    try {
      const res = await fetch("/api/admin/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, sender_name: senderName, title: msgTitle, body: msgBody }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed");
      }
      setMsgTitle("");
      setMsgBody("");
      setSent("✅ Sent — users will see it in their feed.");
      load();
    } catch (e: any) {
      setSent("❌ " + (e.message || "Failed"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6"><p className="text-slate-400">Loading…</p></div>;
  }
  if (!data) {
    return <div className="p-6"><p className="text-slate-400">Failed to load.</p></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">📥 Admin HQ</h1>
          <p className="text-sm text-slate-500">Signups, purchases, letter box &amp; scam registry — all in one place.</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-kawaii-purple text-white text-sm font-bold">🔄 Refresh</button>
      </div>

      {/* ── Leads (dream funnel) ────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-lg">🎯 Funnel Leads ({data.counts.leads})</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[24rem] overflow-y-auto">
          {data.leads.length === 0 ? <p className="text-slate-400 text-sm">No leads yet — run the dream funnel.</p> : data.leads.map((l) => (
            <div key={l.id} className="p-3 rounded-xl border border-kawaii-lavender/20 dark:border-dark-surface">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{l.email}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {[l.path, l.persona].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {l.whatsapp ? (
                    <a href={`https://wa.me/${l.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline" title="Open WhatsApp chat">
                      💬 +{l.whatsapp}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">no #</span>
                  )}
                  {l.plan ? (
                    <Badge variant={l.plan === "pro" ? "success" : l.plan === "basic" ? "secondary" : "outline"}>{l.plan}</Badge>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">no plan</span>
                  )}
                  <span className="text-xs text-slate-400">{fmt(l.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Send feed message ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📨 Send feed message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Recipient</label>
              <input
                value={recipient === "all" ? "" : recipient}
                onChange={(e) => setRecipient(e.target.value.trim() ? e.target.value : "all")}
                placeholder="type email, or 'all' for everyone"
                className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">{recipient === "all" ? "Sending to everyone" : `Sending to ${recipient}`}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Sender name (shown to user)</label>
              <input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Sari Team, Your Recruiter"
                className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          <input
            value={msgTitle}
            onChange={(e) => setMsgTitle(e.target.value)}
            placeholder="Title — e.g. You're in the scout pool 🎉"
            className="w-full h-10 px-3 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
          />
          <textarea
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            placeholder="Message body…"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white dark:bg-dark-card text-sm text-slate-700 dark:text-slate-200"
          />
          <div className="flex items-center gap-3">
            <button onClick={sendMessage} disabled={sending} className="px-4 py-2 rounded-xl bg-dl-green text-white text-sm font-bold disabled:opacity-50">
              {sending ? "Sending…" : "📨 Send"}
            </button>
            {sent && <span className="text-sm text-slate-500">{sent}</span>}
          </div>
        </CardContent>
      </Card>

      {/* ── Signups ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-lg">👥 Signups ({data.counts.signups})</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[24rem] overflow-y-auto">
          {data.signups.length === 0 ? <p className="text-slate-400 text-sm">No signups yet.</p> : data.signups.map((s, i) => (
            <div key={i} className="p-3 rounded-xl border border-kawaii-lavender/20 dark:border-dark-surface">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{s.email || s.name || "Unknown"}</p>
                  {s.name && <p className="text-xs text-slate-400">{s.name}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {s.phone ? (
                    <a
                      href={`https://wa.me/${s.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline"
                      title="Open WhatsApp chat"
                    >
                      💬 +{s.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">no #</span>
                  )}
                  <span className="text-xs text-slate-400">{fmt(s.created_at)}</span>
                </div>
              </div>
              {(s.goal || (s.skills?.length ?? 0) > 0) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {s.goal && (
                    <span className="px-2 py-0.5 rounded-full bg-kawaii-purple/10 text-kawaii-purple dark:text-kawaii-lavender font-semibold">{s.goal}</span>
                  )}
                  {(s.skills || []).map((sk) => (
                    <span key={sk} className="px-2 py-0.5 rounded-full bg-kawaii-lavender/20 dark:bg-dark-surface/50 text-slate-500 dark:text-slate-400">{sk}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Purchases ───────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-lg">💳 Purchases ({data.counts.purchases})</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[24rem] overflow-y-auto">
          {data.purchases.length === 0 ? <p className="text-slate-400 text-sm">No purchases yet.</p> : data.purchases.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-kawaii-lavender/20 dark:border-dark-surface">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{p.email || "Unknown"}</p>
                <p className="text-xs text-slate-400">
                  {p.plan} · {p.status}
                  {p.current_period_end ? ` · until ${fmt(p.current_period_end)}` : ""}
                </p>
              </div>
              <Badge variant={p.status === "active" ? "success" : p.status === "cancelled" ? "outline" : "secondary"}>{p.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Letter Box ──────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-lg">💌 Letter Box ({data.counts.letters})</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[24rem] overflow-y-auto">
          {data.letters.length === 0 ? <p className="text-slate-400 text-sm">No letters yet.</p> : data.letters.map((l) => {
            const u = URGENCY[l.urgency] || URGENCY.medium;
            return (
              <div key={l.id} className="p-3 rounded-xl border border-kawaii-lavender/20 dark:border-dark-surface">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600">{l.category} · {l.email || "Unknown"}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.cls}`}>{u.emoji} {l.urgency}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap">{l.message}</p>
                <p className="text-xs text-slate-400 mt-1">{fmt(l.created_at)}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Scam Registry ───────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-lg">🛡️ Scam Registry ({data.counts.scams})</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[24rem] overflow-y-auto">
          {data.scams.length === 0 ? <p className="text-slate-400 text-sm">No reports yet.</p> : data.scams.map((s) => {
            const r = RISK[s.risk] || RISK.medium;
            return (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl border border-kawaii-lavender/20 dark:border-dark-surface">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{s.domain}</p>
                  <p className="text-xs text-slate-400">{s.company_name || ""} {s.status}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg font-bold shrink-0 ${r.cls}`}>{r.emoji} {s.risk}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
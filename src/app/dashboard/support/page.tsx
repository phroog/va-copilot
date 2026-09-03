"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast";

const CATEGORIES = [
  { key: "bug", label: "🐛 Bug / Something broken" },
  { key: "feature_request", label: "💡 Feature request" },
  { key: "billing", label: "💳 Billing / Plan" },
  { key: "scam_safety", label: "🛡️ Scam / Safety" },
  { key: "job_client", label: "🤝 Job / Client issue" },
  { key: "other", label: "❤️ Other / Feedback" },
];

const URGENCIES = [
  { key: "low", label: "🌱 Low — whenever" },
  { key: "medium", label: "🔶 Medium — soon please" },
  { key: "high", label: "🔺 High — this is blocking me" },
  { key: "urgent", label: "🚨 Urgent — I'm stuck right now" },
];

const URGENCY_BADGE: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-kawaii-lavender/20 text-kawaii-purple dark:text-kawaii-lavender",
  in_progress: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

interface Letter {
  id: string;
  category: string;
  urgency: string;
  message: string;
  status: string;
  created_at: string;
}

function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export default function SupportPage() {
  const { showToast } = useToast();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("other");
  const [urgency, setUrgency] = useState("medium");
  const [sending, setSending] = useState(false);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLetters = useCallback(() => {
    fetch("/api/support")
      .then((r) => r.json())
      .then((d) => setLetters(d.letters ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLetters();
  }, [loadLetters]);

  const submit = async () => {
    if (!message.trim()) {
      showToast("Tell us what's on your mind — a few words is enough.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, urgency, message }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to send");
      setMessage("");
      setCategory("other");
      setUrgency("medium");
      showToast("💌 Letter sent! We've got your back.");
      loadLetters();
    } catch (e: any) {
      showToast(e?.message || "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="text-center">
        <p className="text-5xl mb-3">💌</p>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Support Letter Box</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          Got a problem, a need, or an idea? Drop us a letter. We read every single one —
          and we're here to help, not to leave you hanging.
        </p>
      </div>

      <Card className="border-kawaii-lavender/40 dark:border-dark-surface">
        <CardContent className="p-5 space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="What do you need help with right now…?"
            className="text-sm"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-3 py-2 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-3 py-2 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kawaii-purple"
              >
                {URGENCIES.map((u) => (
                  <option key={u.key} value={u.key}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Button variant="primary" className="w-full" onClick={submit} disabled={sending}>
            {sending ? "Sending…" : "📮 Send my letter"}
          </Button>

          <p className="text-xs text-slate-400 text-center">
            You're not alone in this — every great journey has bumpy roads, and we'll walk them with you. 🍠✨
          </p>
        </CardContent>
      </Card>

      {/* Past letters */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-3">Your letters</h2>
        {loading ? (
          <Card><CardContent className="p-6 text-center text-slate-400 text-sm">Loading…</CardContent></Card>
        ) : letters.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-slate-400">No letters yet. We're listening whenever you're ready.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {letters.map((l) => (
              <Card key={l.id} className="border-kawaii-lavender/30 dark:border-dark-surface">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{categoryLabel(l.category)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCY_BADGE[l.urgency] ?? ""}`}>
                        {l.urgency}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[l.status] ?? ""}`}>
                        {l.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{l.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(l.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

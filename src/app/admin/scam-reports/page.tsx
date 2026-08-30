"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Report {
  id: string;
  domain: string;
  company_name: string;
  description: string;
  risk: string;
  status: string;
  created_at: string;
  auth_users?: { email?: string } | null;
}

const RISK: Record<string, { emoji: string; cls: string }> = {
  low: { emoji: "🟢", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  medium: { emoji: "🟡", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  high: { emoji: "🔴", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

export default function AdminScamReports() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [entries, setEntries] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = async (s: typeof status) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/scam-reports?status=${s}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setEntries(d.entries ?? []);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(status); }, [status]);

  const review = async (id: string, nextStatus: string, risk?: string) => {
    setWorking(id);
    try {
      const res = await fetch("/api/admin/scam-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus, risk }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      load(status);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-extrabold mb-4">🛡️ Scam Registry — Review</h1>
      <div className="flex gap-2 mb-4">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold capitalize ${status === s ? "bg-kawaii-purple text-white" : "bg-white border border-kawaii-lavender/40 text-slate-500"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-slate-400">No {status} reports.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const r = RISK[e.risk] || RISK.medium;
            return (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-extrabold break-all">{e.domain}</p>
                      {e.company_name && <p className="text-sm font-semibold">{e.company_name}</p>}
                      {e.description && <p className="text-xs text-slate-500 mt-1">{e.description}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(e.created_at).toLocaleString()} · reported by {e.auth_users?.email || "?"}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${r.cls}`}>{r.emoji} {e.risk}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <select
                      value={e.risk}
                      onChange={(ev) => review(e.id, e.status, ev.target.value)}
                      disabled={working === e.id}
                      className="rounded-lg border border-kawaii-lavender/40 px-2 py-1 text-sm"
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                    <Button size="sm" variant="primary" onClick={() => review(e.id, "approved", e.risk)} disabled={working === e.id}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review(e.id, "rejected", e.risk)} disabled={working === e.id}>
                      Reject
                    </Button>
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
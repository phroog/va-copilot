"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface PortalData {
  job: { id: string; title: string; platform: string; budget: string; description: string };
  timeEntries: { id: string; description: string; start_time: string; end_time: string | null; hourly_rate: number }[];
  invoices: { id: string; invoice_number: string; status: string; issue_date: string; invoice_items: { total: number }[]; tax_rate: number }[];
}

export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { token } = await params;
      try {
        const res = await fetch(`/api/portal/${token}`);
        if (!res.ok) { setError("Invalid or expired link"); return; }
        const d = await res.json();
        setData(d);
      } catch { setError("Failed to load"); } finally { setLoading(false); }
    })();
  }, [params]);

  if (loading) return <LoadingScreen />;
  if (error || !data) return <ErrorScreen error={error} />;

  const formatDuration = (s: string, e: string | null) => {
    const start = new Date(s).getTime();
    const end = e ? new Date(e).getTime() : Date.now();
    const secs = Math.floor((end - start) / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🚀</div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Client Portal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Powered by VA Copilot</p>
        </div>

        {/* Job Info */}
        <Card className="bg-gradient-to-r from-kawaii-lavender/20 to-kawaii-pink/10 dark:from-kawaii-purple/10 dark:to-kawaii-pink/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💼</span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{data.job.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{data.job.platform}</Badge>
                  {data.job.budget && <Badge variant="secondary" className="text-xs">💰 {data.job.budget}</Badge>}
                </div>
              </div>
            </div>
            {data.job.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{data.job.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Time Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">⏱ Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {data.timeEntries.length === 0 ? (
              <p className="text-sm text-slate-400">No time entries logged yet.</p>
            ) : (
              <div className="space-y-3">
                {data.timeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-2xl bg-kawaii-lavender/15 dark:bg-dark-surface/50">
                    <div>
                      <p className="text-sm font-semibold">{entry.description || "Work session"}</p>
                      <p className="text-xs text-slate-400">{new Date(entry.start_time).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatDuration(entry.start_time, entry.end_time)}</p>
                      <p className="text-xs text-kawaii-purple dark:text-kawaii-lavender">${entry.hourly_rate}/hr</p>
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
            <CardTitle className="text-lg flex items-center gap-2">📄 Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {data.invoices.length === 0 ? (
              <p className="text-sm text-slate-400">No invoices yet.</p>
            ) : (
              <div className="space-y-3">
                {data.invoices.map((inv) => {
                  const sub = (inv.invoice_items ?? []).reduce((s, i) => s + Number(i.total || 0), 0);
                  const total = sub + sub * (Number(inv.tax_rate) / 100);
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-2xl bg-kawaii-lavender/15 dark:bg-dark-surface/50">
                      <div>
                        <p className="text-sm font-semibold">{inv.invoice_number}</p>
                        <p className="text-xs text-slate-400">{inv.issue_date}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          inv.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                          inv.status === "sent" ? "bg-kawaii-lavender/30 text-kawaii-purple" :
                          "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </span>
                        <p className="text-sm font-bold mt-1">${total.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">— Powered by <Link href="/" className="text-kawaii-purple underline">VA Copilot</Link> —</p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center">
      <p className="text-slate-400 animate-pulse">Loading portal...</p>
    </div>
  );
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg flex items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardContent className="p-8">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Access Denied</h1>
          <p className="text-slate-500 text-sm">{error || "This link is invalid or has expired."}</p>
        </CardContent>
      </Card>
    </div>
  );
}

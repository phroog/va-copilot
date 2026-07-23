"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CreditsPage() {
  const supabase = createClient();
  const [credits, setCredits] = useState<{ balance: number; total_used: number } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) return;

    const headers = { Authorization: `Bearer ${session.session.access_token}` };

    try {
      const [credRes, logRes] = await Promise.all([
        fetch("/api/ai/credits", { headers }),
        fetch("/api/ai/credits/logs", { headers }).catch(() => null),
      ]);
      if (credRes.ok) setCredits(await credRes.json());
      if (logRes?.ok) setLogs(await logRes.json());
    } catch {}

    setLoading(false);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-kawaii-purple mb-2">AI Credits</h1>
      <p className="text-slate-500 text-sm mb-6">
        Credits are used for AI-powered features like pitch generation and text polishing.
      </p>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <>
          <div className="bg-white dark:bg-dark-card rounded-kawaii-xl p-6 shadow-sari mb-6">
            <div className="text-center">
              <div className="text-5xl font-extrabold text-kawaii-purple mb-2">
                {credits?.balance ?? 0}
              </div>
              <p className="text-slate-500 text-sm">credits remaining</p>
              <p className="text-slate-400 text-xs mt-1">
                {credits?.total_used ?? 0} credits used total
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-kawaii-xl p-6 shadow-sari">
            <h2 className="text-lg font-bold text-kawaii-purple mb-4">Usage History</h2>
            {logs.length === 0 ? (
              <p className="text-slate-400 text-sm">No usage yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex justify-between text-sm py-1 border-b border-kawaii-lavender/20">
                    <span className="text-slate-600 dark:text-slate-300">{log.endpoint}</span>
                    <span className="text-slate-400">${Number(log.cost).toFixed(6)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-dark-card rounded-kawaii-xl p-6 shadow-sari mt-6">
            <h2 className="text-lg font-bold text-kawaii-purple mb-4">Get More Credits</h2>
            <p className="text-slate-500 text-sm mb-4">
              Credit packs coming soon. You start with 100 free credits.
            </p>
            <button
              disabled
              className="px-6 py-3 bg-kawaii-purple/50 text-white font-bold rounded-kawaii cursor-not-allowed"
            >
              Buy Credits (Coming Soon)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

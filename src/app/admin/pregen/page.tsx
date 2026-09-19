"use client";

import { useState } from "react";
import Link from "next/link";

interface Progress {
  mode: string;
  processed: number;
  generated: number;
  skipped: number;
  nextOffset: number;
  totalNull: number;
  totalLevels: number;
}

export default function PregenPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning] = useState(false);
  const [auto, setAuto] = useState(false);
  const [message, setMessage] = useState("");

  const runChunk = async (mode: "offline" | "ai", limit: number, offset = progress?.nextOffset ?? 0) => {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/pregen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, limit, offset }),
      });
      if (res.status === 401) {
        window.location.href = "/auth/login?returnUrl=/admin/pregen";
        return;
      }
      if (!res.ok) throw new Error("failed");
      const d = await res.json();
      setProgress(d);
      setMessage(`${d.generated} generated, ${d.skipped} already cached.`);
      return d;
    } catch (e: any) {
      setMessage("Error: " + (e.message || "unknown"));
    } finally {
      setRunning(false);
    }
  };

  const runAll = async (mode: "offline" | "ai") => {
    setAuto(true);
    setRunning(true);
    let offset = 0;
    let guard = 0;
    try {
      while (guard < 600) {
        guard++;
        const d = await runChunk(mode, 40, offset);
        if (!d) break;
        offset = d.nextOffset;
        if (offset >= d.totalLevels || d.processed === 0) break;
      }
    } finally {
      setAuto(false);
      setRunning(false);
    }
  };

  const remaining = progress ? Math.max(progress.totalNull - progress.generated, 0) : null;

  return (
    <div className="min-h-screen bg-[#14162a] text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">🧪 Level Pre-Generation</h1>
        <Link href="/learn" className="text-sm font-bold text-kawaii-purple hover:underline">← back to app</Link>
      </div>

      <p className="text-sm text-white/60 mb-6 leading-relaxed">
        Levels are already cached globally once generated — this tool just fills them in advance so nobody waits on the AI at play time.
        <br />
        <span className="text-white/40 text-xs">offline = deterministic template (instant, free) · ai = DeepSeek quality (slower, costs platform AI)</span>
      </p>

      {progress && (
        <div className="rounded-2xl border border-white/10 bg-[#1f2233] p-4 mb-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-extrabold text-dl-purpleLight">{progress.generated}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">generated</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white">{remaining ?? "…"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">remaining</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-white">{progress.totalLevels}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">total levels</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-dl-green rounded-full transition-all" style={{ width: `${progress.totalLevels ? (progress.nextOffset / progress.totalLevels) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => runChunk("offline", 25)}
          disabled={running}
          className="px-5 py-3 rounded-2xl bg-dl-green text-white font-extrabold hover:brightness-105 disabled:opacity-40 transition-all squishy"
        >
          Offline fill · next 25
        </button>
        <button
          onClick={() => runAll("offline")}
          disabled={running}
          className="px-5 py-3 rounded-2xl bg-kawaii-purple text-white font-extrabold hover:brightness-110 disabled:opacity-40 transition-all squishy"
        >
          Offline fill · ALL
        </button>
        <button
          onClick={() => runChunk("ai", 10)}
          disabled={running}
          className="px-5 py-3 rounded-2xl bg-dl-gold text-[#854c00] font-extrabold hover:brightness-110 disabled:opacity-40 transition-all squishy"
        >
          AI generate · next 10
        </button>
      </div>

      <p className="mt-3 text-sm font-bold text-white/70">{message || (running ? (auto ? "Running… (looping)" : "Working…") : "Idle")}</p>
    </div>
  );
}
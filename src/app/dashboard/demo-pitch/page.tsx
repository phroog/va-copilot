"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* Interactive demo of the AI pitch generator. Used by the first-run tour so new
   users see exactly what a generated pitch looks like — without spending a
   credit. The "real" generator lives on the job detail page. */

const SAMPLE_JOB = {
  title: "Executive Virtual Assistant — Inbox & Calendar",
  platform: "OnlineJobs.ph",
  budget: "$15–$20/hr",
  client: "Sarah, founder of a boutique agency",
  description:
    "We need a reliable VA to manage a busy inbox, schedule meetings across time zones and keep our CRM tidy. Remote, part-time, long-term.",
};

const SAMPLE_PITCH = `Hi Sarah,

I'd love to help you keep your inbox and calendar under control so you can focus on growing your agency.

For the past 2+ years I've managed inboxes and schedules for busy founders — triaging email, coordinating meetings across time zones, and keeping CRMs spotless. I'm fully remote, available in your time zone, and comfortable working independently.

I'd be happy to start with a small trial week so you can see how I work.

Looking forward to hearing from you,
[Your name]`;

export default function DemoPitchPage() {
  const [pitch, setPitch] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setGenerating(true);
    setPitch(null);
    setTimeout(() => {
      setPitch(SAMPLE_PITCH);
      setGenerating(false);
    }, 1600);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pitch || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">🚀 AI Pitch — live demo</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            This is exactly what you get on any matching job — a tailored pitch, ready to send. (Demo: no credit spent.)
          </p>
        </div>
        <Link href="/dashboard/live-feed">
          <Button variant="outline" size="sm">← Back to feed</Button>
        </Link>
      </div>

      {/* The job */}
      <Card className="border-kawaii-lavender/40 dark:border-dark-surface">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💼</span>
            <div>
              <h2 className="font-extrabold text-slate-800 dark:text-slate-100">{SAMPLE_JOB.title}</h2>
              <p className="text-xs text-slate-400">
                {SAMPLE_JOB.platform} · {SAMPLE_JOB.budget} · 👤 {SAMPLE_JOB.client}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">{SAMPLE_JOB.description}</p>
        </CardContent>
      </Card>

      {/* The generated pitch */}
      <Card className="border-kawaii-purple/40 dark:border-kawaii-lavender/30 bg-gradient-to-br from-kawaii-purple/5 to-kawaii-pink/5 dark:from-kawaii-purple/10 dark:to-kawaii-pink/10">
        <CardContent className="p-5">
          {!pitch && (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🤖</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {generating ? "Writing your pitch…" : "Click to generate a tailored pitch for this job."}
              </p>
              {generating && (
                <div className="mt-3 h-2 w-full max-w-xs mx-auto rounded-full bg-kawaii-lavender/20 overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-kawaii-purple to-kawaii-pink rounded-full animate-pulse" />
                </div>
              )}
              {!generating && (
                <Button className="mt-4 px-8 py-3 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold squishy" onClick={generate}>
                  ✨ Generate pitch
                </Button>
              )}
            </div>
          )}
          {pitch && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-kawaii-purple dark:text-kawaii-lavender">
                  ✨ Generated pitch
                </span>
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? "✅ Copied!" : "📋 Copy"}
                </Button>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed animate-fade-in">{pitch}</p>
              <div className="mt-4 pt-3 border-t border-kawaii-lavender/20 dark:border-dark-surface flex items-center gap-2 text-xs text-slate-400">
                <span>🎯 Tailored to the client · 1 credit for real generations</span>
                <span className="ml-auto">📝 Editable before you send</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-400">
        This is step 2 of your tour —{" "}
        <button onClick={() => window.location.reload()} className="text-kawaii-purple underline">see it again</button>{" "}
        or move on. Your real pitches live on every job in the{" "}
        <Link href="/dashboard/live-feed" className="text-kawaii-purple underline">live feed</Link>.
      </p>
    </div>
  );
}
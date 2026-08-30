"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { ScamGauge } from "@/components/scam-gauge";
import { startSpeech, speechSupported } from "@/lib/client/speech";

interface JobOption { id: string; title: string; client_name: string; }

const MAX_ANSWER = 160;

export default function InterviewPage() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [scenario, setScenario] = useState("");
  const [jobId, setJobId] = useState("");
  const [phase, setPhase] = useState<"setup" | "interview" | "done">("setup");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // voice
  const [listening, setListening] = useState(false);
  const canSpeak = speechSupported();

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => setJobs((d.jobs ?? []).filter((j: JobOption) => j.title)))
      .catch(() => {});
  }, []);

  const startInterview = async () => {
    if (!scenario.trim() && !jobId) {
      showToast("Enter a scenario or pick a saved job", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, job_id: jobId || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to start");
      setSessionId(d.sessionId);
      setQuestions(d.questions);
      setAnswers(new Array(d.questions.length).fill(""));
      setIndex(0);
      setPhase("interview");
    } catch (e: any) {
      showToast(e?.message || "Failed to start interview", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async (i: number, text: string) => {
    setAnswers((prev) => { const n = [...prev]; n[i] = text; return n; });
    await fetch("/api/interview/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, index: i, answer: text }),
    }).catch(() => {});
  };

  const next = () => {
    if (index < questions.length - 1) setIndex(index + 1);
    else finish();
  };

  const finish = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/interview/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Analysis failed");
      setResult(d.result);
      setPhase("done");
    } catch (e: any) {
      showToast(e?.message || "Analysis failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    if (listening) { setListening(false); return; }
    const h = startSpeech({
      onResult: (text) => {
        const next = (answers[index] ? answers[index] + " " : "") + text;
        const clipped = next.slice(0, MAX_ANSWER);
        saveAnswer(index, clipped);
      },
      onEnd: () => setListening(false),
      onError: () => { setListening(false); showToast("Speech not available", "error"); },
    });
    if (h) setListening(true);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-3xl font-extrabold">🎙️ AI Interview Simulator</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Practice interviews against real hiring questions.{" "}
        <b>Answer short &amp; precise</b> — that's how pros win clients. Our AI scores
        clarity and specificity, not word count.
      </p>

      {/* ── SETUP ── */}
      {phase === "setup" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Set up your interview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Or pick a saved job</p>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full rounded-2xl border-2 border-kawaii-lavender/30 bg-white/80 px-4 py-2.5 text-sm text-slate-700 dark:bg-dark-card dark:text-slate-200 dark:border-dark-surface"
              >
                <option value="">— Custom scenario —</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.client_name ? ` · ${j.client_name}` : ""}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">…or type a scenario</p>
              <Textarea
                rows={3}
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="e.g. Interviewing for a social media VA role for a US e-commerce brand…"
              />
            </div>
            <Button variant="primary" onClick={startInterview} disabled={loading}>
              {loading ? "Starting…" : "🎙️ Start interview (1🪙)"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── INTERVIEW ── */}
      {phase === "interview" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Question {index + 1} / {questions.length}</CardTitle>
              <span className="text-xs font-bold text-slate-400">{Math.round((index / questions.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-kawaii-lavender/20 dark:bg-dark-surface rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all" style={{ width: `${((index) / questions.length) * 100}%` }} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{questions[index]}</p>
            <div className="relative">
              <Textarea
                rows={4}
                value={answers[index] || ""}
                onChange={(e) => saveAnswer(index, e.target.value.slice(0, MAX_ANSWER))}
                placeholder="Answer short & precise…"
                className="pr-10"
              />
              {canSpeak && (
                <button
                  onClick={toggleMic}
                  className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${listening ? "bg-red-500 text-white animate-pulse" : "bg-kawaii-lavender/30 hover:bg-kawaii-lavender/50"}`}
                  title={listening ? "Stop" : "Speak your answer"}
                >
                  🎤
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${(answers[index] || "").length > MAX_ANSWER * 0.8 ? "text-amber-500" : "text-slate-400"}`}>
                {(answers[index] || "").length}/{MAX_ANSWER} — keep it short
              </span>
              <div className="flex gap-2">
                {index > 0 && <Button size="sm" variant="outline" onClick={() => setIndex(index - 1)}>← Back</Button>}
                <Button size="sm" variant="primary" onClick={next} disabled={loading}>
                  {index < questions.length - 1 ? "Next →" : loading ? "Analysing…" : "Finish & get analysis 🎯"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── RESULT ── */}
      {phase === "done" && result && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-5">
              <ScamGauge score={result.score} />
              <div className="flex-1">
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{result.score}/100</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{result.summary}</p>
              </div>
            </CardContent>
          </Card>

          {Array.isArray(result.feedback) && result.feedback.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Per-question feedback</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.feedback.map((f: any, i: number) => (
                  <div key={i} className="rounded-2xl bg-white/60 dark:bg-dark-surface/40 p-3">
                    <p className="text-xs font-bold text-kawaii-purple dark:text-kawaii-lavender">{questions[i]}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1"><b>You:</b> {f.answer || "—"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <b className={f.verdict === "Strong" ? "text-green-600" : f.verdict === "Good" ? "text-kawaii-purple" : "text-amber-600"}>{f.verdict}</b>
                      {f.tip ? ` · ${f.tip}` : ""}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {Array.isArray(result.tips) && result.tips.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">💡 Tips</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {result.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={() => { setPhase("setup"); setScenario(""); setJobId(""); setResult(null); setQuestions([]); setAnswers([]); }}>
            🔄 New interview
          </Button>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import TelegramSettings from "@/components/telegram-settings";

/* Konfiguration — 3-step setup:
   1. Notification email (job pushes + marketing)
   2. Browser extension (install guide + ZIP download)
   3. Telegram (pro-gated: locked with CTA for non-pro, config steps for pro) */

export default function SetupPage() {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pushMatches, setPushMatches] = useState(false);
  const [marketing, setMarketing] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sub, us] = await Promise.all([
          fetch("/api/subscription-status").then((r) => r.json()),
          fetch("/api/user-settings").then((r) => r.json()),
        ]);
        setPlan(sub.plan ?? "free");
        const s = us.settings;
        if (s) {
          setEmail(s.notification_email ?? "");
          setPushMatches(!!s.email_push_matches);
          setMarketing(s.email_marketing_opt_in !== false);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const saveEmail = async () => {
    setSavingEmail(true);
    setEmailSaved(false);
    try {
      const res = await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_email: email.trim(),
          email_push_matches: pushMatches,
          email_marketing_opt_in: marketing,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      setEmailSaved(true);
      showToast("Email saved ✅");
      setTimeout(() => setStep(2), 600);
    } catch {
      showToast("Could not save email", "error");
    } finally { setSavingEmail(false); }
  };

  const steps = [
    { n: 1, title: "Notification email", emoji: "📬" },
    { n: 2, title: "Browser extension", emoji: "🧩" },
    { n: 3, title: "Telegram", emoji: "📨" },
  ];

  if (loading) return <div className="p-8 text-center text-slate-400">Loading…</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">⚙️ Konfiguration</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Three quick steps to get your job alerts flowing.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold transition-all flex-1 ${
                step === s.n
                  ? "bg-kawaii-purple text-white shadow-sm"
                  : step > s.n
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-white/70 dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface text-slate-500 dark:text-slate-400"
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-white/30">
                {step > s.n ? "✓" : s.n}
              </span>
              <span className="hidden sm:inline">{s.emoji} {s.title}</span>
            </button>
            {i < steps.length - 1 && <div className="w-4 h-px bg-kawaii-lavender/40" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Email ───────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="border-kawaii-lavender/40 dark:border-dark-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">📬 Where should your job alerts go?</CardTitle>
            <CardDescription>
              We'll send you an email whenever a matching job appears — plus occasional tips &amp; offers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Notification email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <p className="text-xs text-slate-400">Leave empty to use your account email.</p>
            </div>
            <label className="flex items-center gap-3 py-2 cursor-pointer">
              <input type="checkbox" checked={pushMatches} onChange={(e) => setPushMatches(e.target.checked)} className="w-5 h-5" />
              <span className="text-sm text-slate-600 dark:text-slate-300">🎯 Email me new matching jobs</span>
            </label>
            <label className="flex items-center gap-3 py-2 cursor-pointer">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="w-5 h-5" />
              <span className="text-sm text-slate-600 dark:text-slate-300">💌 Occasional tips &amp; offers</span>
            </label>
            <div className="flex items-center gap-3 pt-2">
              <Button variant="primary" onClick={saveEmail} disabled={savingEmail}>
                {savingEmail ? "Saving…" : "Save & continue →"}
              </Button>
              {emailSaved && <span className="text-sm text-green-500 animate-fade-in">✅ Saved!</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Browser extension ───────────────────────────────── */}
      {step === 2 && (
        <Card className="border-kawaii-lavender/40 dark:border-dark-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">🧩 Sari Browser Extension</CardTitle>
            <CardDescription>
              Scan job boards, autofill your vault, and track time right from your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-kawaii-purple/10 border border-kawaii-purple/30 p-3 text-sm font-bold text-kawaii-purple dark:text-kawaii-lavender">
              🚀 Coming to the Chrome Web Store soon — but already usable today!
            </div>
            <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal pl-5">
              <li>Download the extension ZIP below.</li>
              <li>Open Chrome and go to <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-dark-surface rounded">chrome://extensions</code>.</li>
              <li>Turn on <b>Developer mode</b> (top right).</li>
              <li>Click <b>Load unpacked</b> and select the extracted folder.</li>
              <li>Open the Sari popup and log in — you're set.</li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="/api/setup/extension-zip"
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white text-sm font-extrabold hover:opacity-90 transition-opacity"
              >
                📦 Download extension (ZIP)
              </a>
              <Link href="/dashboard/settings">
                <Button variant="outline" className="h-full">More settings →</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Telegram (pro-gated) ────────────────────────────── */}
      {step === 3 && (
        plan === "pro" ? (
          <TelegramSettings />
        ) : (
          <Card className="border-kawaii-coral/40 dark:border-kawaii-pink/30 bg-gradient-to-br from-kawaii-coral/10 to-kawaii-pink/10 dark:from-kawaii-pink/15 dark:to-kawaii-purple/15">
            <CardContent className="p-8 text-center">
              <p className="text-5xl mb-3">🔒</p>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                Telegram alerts are a <span className="text-kawaii-coral dark:text-kawaii-pink">Money Club</span> perk
              </h2>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                Get new matching jobs pushed straight to your phone the second they appear —{" "}
                <b>before other freelancers even see them</b>. No checking the app, no missed
                opportunities. Money Club members never miss a high-paying job.
              </p>
              <ul className="mt-4 inline-block text-left text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <li>⚡ Instant match alerts on Telegram</li>
                <li>🎯 Only high-confidence jobs (75%+ match)</li>
                <li>⏰ Follow-up &amp; invoice reminders</li>
                <li>🛡️ Scam alerts in real time</li>
              </ul>
              <div className="mt-6">
                <Link href="/pricing">
                  <Button className="px-8 py-3 text-base rounded-2xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-extrabold animate-glow-pulse">
                    👑 Unlock with Money Club
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
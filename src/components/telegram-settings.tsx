"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/toast";

const BOT_URL = (username: string) => `https://t.me/${username}`;

export default function TelegramSettings() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<{ configured: boolean; botUsername: string; linked: boolean; chatId: number | null; username: string | null; linkedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<{ telegram_enabled: boolean; telegram_push_matches: boolean; telegram_push_followups: boolean; telegram_push_invoices: boolean; telegram_push_scam: boolean }>({
    telegram_enabled: false,
    telegram_push_matches: false,
    telegram_push_followups: false,
    telegram_push_invoices: false,
    telegram_push_scam: false,
  });

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        fetch("/api/telegram/connect").then((r) => r.json()),
        fetch("/api/user-settings").then((r) => r.json()),
      ]);
      setStatus(s);
      const set = p.settings;
      if (set) {
        setPrefs({
          telegram_enabled: set.telegram_enabled === true,
          telegram_push_matches: set.telegram_push_matches === true,
          telegram_push_followups: set.telegram_push_followups === true,
          telegram_push_invoices: set.telegram_push_invoices === true,
          telegram_push_scam: set.telegram_push_scam === true,
        });
      }
    } catch {
      showToast("Failed to load Telegram settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generateCode = async () => {
    setGenerating(true);
    setGeneratedCode(null);
    try {
      const res = await fetch("/api/telegram/connect", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error");
      setGeneratedCode(d.code);
      showToast("Code generated! Send it to the bot with /start <code>.");
    } catch (e: any) {
      showToast(e?.message || "Failed", "error");
    } finally {
      setGenerating(false);
    }
  };

  const updatePrefs = async (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      const res = await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("Update failed");
      showToast("Saved ✅");
    } catch {
      showToast("Saving failed", "error");
    }
  };

  const disconnect = async () => {
    await fetch("/api/telegram/connect", { method: "DELETE" });
    await updatePrefs({ telegram_enabled: false, telegram_push_matches: false, telegram_push_followups: false, telegram_push_invoices: false, telegram_push_scam: false });
    setStatus((s) => s ? { ...s, linked: false, chatId: null, username: null } : s);
    showToast("Telegram disconnected");
  };

  if (loading) return <Card className="animate-pulse"><CardContent className="p-8" /></Card>;

  const botName = status?.botUsername || "your-bot";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">📨 Telegram</CardTitle>
        <CardDescription>Push notifications & commands via a Telegram bot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.configured ? (
          <p className="text-sm text-slate-500">
            ⚠️ Telegram is not set up yet (bot token missing on the server).
          </p>
        ) : status?.linked ? (
          <>
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-3 text-sm">
              ✅ Connected to chat <b>@{status.username || status.chatId}</b>
              {status.linkedAt ? ` (since ${new Date(status.linkedAt).toLocaleDateString()})` : ""}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Notifications</p>
              {([
                ["telegram_push_matches", "🎯 New job matches"],
                ["telegram_push_followups", "⏰ Due follow-ups"],
                ["telegram_push_invoices", "📄 Open invoices"],
                ["telegram_push_scam", "🛡️ Scam alerts"],
              ] as [keyof typeof prefs, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) => updatePrefs({ [key]: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                </label>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={disconnect}>Disconnect</Button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              1. Open the bot in Telegram:{" "}
              <a
                href={BOT_URL(botName)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-kawaii-purple dark:text-kawaii-lavender underline underline-offset-2"
              >
                @{botName} ↗
              </a>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              2. Tap <b>Start</b>.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              3. Click <b>„Generate code"</b> and send the bot <b>/start &lt;code&gt;</b>.
            </p>

            {generatedCode ? (
              <div className="rounded-2xl bg-kawaii-purple/10 border border-kawaii-purple/40 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Your verification code:</p>
                <p className="text-3xl font-extrabold tracking-widest text-kawaii-purple dark:text-kawaii-lavender">{generatedCode}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Send <code>/start {generatedCode}</code> to{" "}
                  <a href={BOT_URL(botName)} target="_blank" rel="noopener noreferrer" className="text-kawaii-purple underline">@{botName}</a>.
                </p>
                <a href={BOT_URL(botName)} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="mt-3">📲 Open in bot now</Button>
                </a>
              </div>
            ) : (
              <Button variant="primary" onClick={generateCode} disabled={generating}>
                {generating ? "Generating…" : "🔑 Generate code"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
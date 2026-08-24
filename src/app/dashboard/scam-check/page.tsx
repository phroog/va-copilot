"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";
import { ScamGauge } from "@/components/scam-gauge";
import { quickUrlCheck, heuristicEvidence, type ScamEvidence } from "@/lib/client/scam-scan";

const LEVEL_META: Record<string, { emoji: string; label: string; cls: string }> = {
  green: { emoji: "🟢", label: "Gering", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  yellow: { emoji: "🟡", label: "Mittel", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  orange: { emoji: "🟠", label: "Erhöht", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  red: { emoji: "🔴", label: "Hoch", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

export default function ScamCheckPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScamEvidence | null>(null);
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("url");
    if (q) setUrl(q);
    const j = u.searchParams.get("job");
    if (j) setSource(`Aus Job ${j}`);
  }, []);

  const scan = useCallback(async (target: string) => {
    setChecking(true);
    setResult(null);

    const pre = quickUrlCheck(target);
    if (pre) {
      setChecking(false);
      showToast(pre, "error");
      return;
    }

    // Open the page in the user's own tab (works on desktop & mobile).
    const tab = window.open(target, "_blank", "noopener");
    if (!tab) {
      setChecking(false);
      showToast("Pop-up wurde blockiert – bitte erlauben und erneut versuchen.", "error");
      return;
    }

    let ev: ScamEvidence;
    try {
      // A browser tab on another origin cannot be read by a plain script (CORS),
      // so we try the deterministic heuristic + a live cross-origin fetch that
      // usually fails, then fall back gracefully.
      const res = await fetch(target, { mode: "cors" }).catch(() => null);
      if (res && res.ok) {
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        ev = { ...(doc.body ? scanDom(doc, target) : {}), inspected: true } as ScamEvidence;
      } else {
        ev = heuristicEvidence(target);
      }
    } catch {
      ev = heuristicEvidence(target);
    }

    // Optional: ask the AI to interpret the URL + what we found.
    const ai = await fetch("/api/ai/scam-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        website_url: target,
        client_name: source || undefined,
        job_description: ev.flags.map((f) => f.label).join("; ") || undefined,
      }),
    }).then(async (r) => {
      if (r.ok) return r.json();
      if (r.status === 402) return { score: null, analysis: null, noCredits: true };
      return { score: null, analysis: null };
    }).catch(() => ({ score: null, analysis: null }));

    const finalScore = typeof ai.score === "number" ? ai.score : ev.score;
    const finalLevel = finalScore >= 70 ? "red" : finalScore >= 50 ? "orange" : finalScore >= 30 ? "yellow" : "green";

    setResult({
      ...ev,
      score: finalScore,
      level: finalLevel,
      pageTitle: ev.pageTitle || target,
      noCredits: (ai as any).noCredits,
    } as any);
    setChecking(false);
  }, [source, showToast]);

  const handleScan = () => {
    const target = url.trim();
    if (!target) {
      showToast("Bitte eine Job-URL eingeben oder einen Job auswählen.", "error");
      return;
    }
    if (!/^https?:\/\//i.test(target)) {
      showToast("Bitte eine gültige URL mit http(s):// eingeben.", "error");
      return;
    }
    scan(target);
  };

  const m = result ? LEVEL_META[result.level] : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-3xl font-extrabold">🕵️ {t("scamCheck")}</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Gib die Job-URL ein (oder nutze einen Job aus Live-Feed / Extension, der hier reingezogen wurde). Beim Scan öffnet
        sich die Seite in deinem Tab und wird direkt auf Scam-Muster geprüft – auch am Handy.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 Job-Scam-Scan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Job-URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="https://www.upwork.com/jobs/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
              />
              <Button variant="primary" onClick={handleScan} disabled={checking || !url.trim()}>
                {checking ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("checking")}
                  </span>
                ) : (
                  "🔍 " + t("runScamCheck") + " (1🪙)"
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Die Seite öffnet sich in einem neuen Tab und wird dort direkt analysiert.</p>
          </div>

          {source && <p className="text-xs text-kawaii-purple dark:text-kawaii-lavender">📎 {source}</p>}

          {result && (
            <div className="rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface p-5 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ScamGauge score={result.score} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${m?.cls}`}>
                      {m?.emoji} {m?.label}
                    </span>
                    <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{result.score}% Risiko</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 break-all">{result.pageTitle || result.pageUrl}</p>
                  {!result.inspected && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠ Seite konnte nicht direkt gelesen werden (Sicherheitsbeschränkung) – Ergebnis basiert auf Domain + KI.
                    </p>
                  )}
                </div>
              </div>

              {result.flags.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Gefundene Hinweise</p>
                  <ul className="space-y-1.5">
                    {result.flags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="text-kawaii-coral">⚠</span>
                        <span className="flex-1">{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.signals.offPlatformLinks.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Links auf andere Seiten</p>
                  <p className="text-xs text-slate-500 break-all">{result.signals.offPlatformLinks.join(", ")}</p>
                </div>
              )}
              {result.signals.suspiciousSites.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">Verdächtige Ziele</p>
                  <p className="text-xs text-red-500 break-all">{result.signals.suspiciousSites.join(", ")}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* Local helper (kept out of the shared lib to avoid importing a DOM type into
   a module that also runs on the server). */
function scanDom(doc: Document, baseUrl: string): Partial<ScamEvidence> {
  const flags: { label: string; severity: number }[] = [];
  const seen = new Set<string>();
  const signals = { offPlatformLinks: [] as string[], paymentMethods: [] as string[], requestedData: [] as string[], suspiciousSites: [] as string[], generic: [] as string[] };
  const baseHost = (() => { try { return new URL(baseUrl).hostname; } catch { return ""; } })();
  const text = (doc.body?.innerText || "").toLowerCase();
  const links: string[] = [];
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    try { links.push(new URL(href, baseUrl).href); } catch {}
  });
  for (const link of links) {
    let host = "";
    try { host = new URL(link).hostname; } catch { continue; }
    const h = host.replace(/^www\./, "");
    const b = baseHost.replace(/^www\./, "");
    if (h === b || h.endsWith("." + b)) continue;
    if (!signals.offPlatformLinks.includes(host)) signals.offPlatformLinks.push(host);
    if (/\.(zip|mov|country|click|gq|top|xyz|tk|ml|cf|ga|date|icu|work|racing)$/i.test(host)) {
      if (!signals.suspiciousSites.includes(host)) signals.suspiciousSites.push(host);
    }
  }
  const addFlag = (label: string, sev: number) => { if (!seen.has(label)) { seen.add(label); flags.push({ label, severity: sev }); } };
  if (/western union|moneygram|wire transfer|gift card|bitcoin|crypto|paypal\s*(friends|family)/i.test(text)) addFlag("Zahlung per Überweisung/Geschenkkarte", 30);
  if (/credit card|card details|bank account|ssn|social security|passport|id copy/i.test(text)) addFlag("Sensible Daten angefordert", 25);
  if (/processing|application|registration|activation fee|pay to (register|apply)|deposit.*(secure|reserve)|payment.*(upfront|in advance)/i.test(text)) addFlag("Gebühr vorab / Zahlung verlangt", 30);
  if (/unlimited earning|guaranteed (income|salary|profit)|get rich|residual income|passive income/i.test(text)) addFlag("Zu gut um wahr zu sein", 25);
  if (/recruiters? needed|referral (bonus|commission)|network marketing|multi[- ]level/i.test(text)) addFlag("MLM/Recruiting-Muster", 20);
  if (/(work|do|test|sample).*(free|without pay)|unpaid (trial|test)/i.test(text)) addFlag("Unbezahlte Testarbeit", 25);
  if (/urgent|start (immediately|now|today)|no interview/i.test(text)) addFlag("Dringlichkeit/Druck", 10);
  const tg = Array.from(doc.querySelectorAll('a[href*="t.me"], a[href*="wa.me"], a[href*="whatsapp"]')).length;
  if (tg > 0) addFlag("Kontakt über Telegram/WhatsApp", 25);
  if (signals.suspiciousSites.length > 0) addFlag("Verdächtige Links auf der Seite", 25);
  let score = 10;
  for (const f of flags) score += f.severity;
  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? "red" : score >= 50 ? "orange" : score >= 30 ? "yellow" : "green";
  return { score, level, flags, signals, pageTitle: doc.title || undefined, pageUrl: (() => { try { return doc.location?.href || baseUrl; } catch { return baseUrl; } })(), checkedAt: new Date().toISOString() };
}
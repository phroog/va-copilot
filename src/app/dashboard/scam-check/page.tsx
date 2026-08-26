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
import { detectExtension, isMobileDevice, scanWithExtension } from "@/lib/client/extension-scan";

const LEVEL_META: Record<string, { emoji: string; label: string; cls: string }> = {
  green: { emoji: "🟢", label: "Low", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  yellow: { emoji: "🟡", label: "Medium", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  orange: { emoji: "🟠", label: "Elevated", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  red: { emoji: "🔴", label: "High", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

export default function ScamCheckPage() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ScamEvidence | null>(null);
  const [source, setSource] = useState<string>("");

  const [mobile] = useState(isMobileDevice);
  const [ext, setExt] = useState<"checking" | "yes" | "no">("checking");

  useEffect(() => {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("url");
    if (q) setUrl(q);
    const j = u.searchParams.get("job");
    if (j) setSource(`From Job ${j}`);
  }, []);

  // Detect the extension on desktop.
  useEffect(() => {
    if (mobile) { setExt("no"); return; }
    let active = true;
    detectExtension().then((yes) => { if (active) setExt(yes ? "yes" : "no"); });
    return () => { active = false; };
  }, [mobile]);

  const simpleScan = useCallback(async (target: string) => {
    // Open the page in the user's own tab (works on desktop & mobile).
    const tab = window.open(target, "_blank", "noopener");
    if (!tab) {
      showToast("Pop-up was blocked – please allow it and try again.", "error");
      return;
    }

    let ev: ScamEvidence = heuristicEvidence(target);
    try {
      const res = await fetch(target, { mode: "cors" }).catch(() => null);
      if (res && res.ok) {
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (doc.body) {
          ev = { ...scanDom(doc, target), inspected: true } as ScamEvidence;
        }
      }
    } catch {
      /* cross-origin blocked — keep heuristic */
    }

    const ai = await fetch("/api/ai/scam-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        website_url: target,
        client_name: source || undefined,
        job_description: ev.flags.map((f) => f.label).join("; ") || undefined,
        payment_info: [ev.signals.paymentMethods, ev.signals.requestedData].flat().join("; ") || undefined,
      }),
    }).then(async (r) => {
      if (r.ok) return r.json();
      return { score: null, analysis: null };
    }).catch(() => ({ score: null, analysis: null }));

    const finalScore = typeof ai.score === "number" ? ai.score : ev.score;
    const finalLevel = finalScore >= 70 ? "red" : finalScore >= 50 ? "orange" : finalScore >= 30 ? "yellow" : "green";
    setResult({ ...ev, score: finalScore, level: finalLevel, pageTitle: ev.pageTitle || target });
  }, [source, showToast]);

  const extensionScan = useCallback(async (target: string) => {
    setChecking(true);
    setResult(null);
    const res = await scanWithExtension(target);
    if (!res.ok || !res.evidence) {
      setChecking(false);
      showToast(res.error || "Extension scan failed – try the simple scan.", "error");
      return;
    }
    let ev = res.evidence as ScamEvidence;
    const ai = await fetch("/api/ai/scam-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        website_url: target,
        client_name: source || undefined,
        job_description: ev.flags.map((f) => f.label).join("; ") || undefined,
        payment_info: [ev.signals.paymentMethods, ev.signals.requestedData].flat().join("; ") || undefined,
      }),
    }).then(async (r) => (r.ok ? r.json() : { score: null, analysis: null })).catch(() => ({ score: null, analysis: null }));
    const finalScore = typeof ai.score === "number" ? ai.score : ev.score;
    const finalLevel = finalScore >= 70 ? "red" : finalScore >= 50 ? "orange" : finalScore >= 30 ? "yellow" : "green";
    setResult({ ...ev, score: finalScore, level: finalLevel, pageTitle: ev.pageTitle || target });
    setChecking(false);
  }, [source, showToast]);

  const handleScan = () => {
    const target = url.trim();
    if (!target) {
      showToast("Please enter a job URL or select a job.", "error");
      return;
    }
    if (!/^https?:\/\//i.test(target)) {
      showToast("Please enter a valid URL with http(s)://.", "error");
      return;
    }
    const pre = quickUrlCheck(target);
    if (pre) { showToast(pre, "error"); return; }

    if (!mobile && ext === "yes") {
      extensionScan(target);
    } else {
      simpleScan(target);
    }
  };

  const m = result ? LEVEL_META[result.level] : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="text-3xl font-extrabold">🕵️ {t("scamCheck")}</h1>
      <p className="text-slate-500 dark:text-slate-400">
        Enter a job URL (or use a job from Live Feed / extension) and press Scan.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 Job Scam Scan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Job URL</Label>
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
          </div>

          {/* Scan mode notice */}
          <div className={`rounded-2xl border p-3 text-sm ${mobile ? "border-amber-300/60 bg-amber-50/70 dark:bg-amber-900/10" : ext === "yes" ? "border-green-300/60 bg-green-50/70 dark:bg-green-900/10" : "border-kawaii-lavender/40 bg-kawaii-lavender/10 dark:bg-dark-surface"}`}>
            {mobile ? (
              <p className="text-amber-700 dark:text-amber-300">
                ⚠️ <strong>Caution – only a rough scan.</strong> On mobile, Sari can't read the page directly;
                the result is based on a few small facts (domain + AI). For a full scan, please use your PC.
              </p>
            ) : ext === "checking" ? (
              <p className="text-slate-500">Checking browser extension…</p>
            ) : ext === "yes" ? (
              <p className="text-green-700 dark:text-green-300">
                ✅ Browser extension detected – the scan opens the real page and fully checks it there (DOM).
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-kawaii-purple dark:text-kawaii-lavender">
                  🧩 Browser extension not installed. For a <strong>full scan</strong> on the real page:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open("https://chrome.google.com/webstore", "_blank")}>
                    📥 Install Sari extension
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => simpleScan(url.trim())} disabled={checking || !url.trim()}>
                    Or: simple scan (like on mobile) →
                  </Button>
                </div>
              </div>
            )}
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
                    <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{result.score}% Risk</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 break-all">{result.pageTitle || result.pageUrl}</p>
                  {!result.inspected && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠ The page could not be read directly (security restriction) – the result is based on domain + AI.
                    </p>
                  )}
                </div>
              </div>

              {result.flags.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Signals found</p>
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
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Links to other pages</p>
                  <p className="text-xs text-slate-500 break-all">{result.signals.offPlatformLinks.join(", ")}</p>
                </div>
              )}
              {result.signals.suspiciousSites.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">Suspicious targets</p>
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
  if (/western union|moneygram|wire transfer|gift card|bitcoin|crypto|paypal\s*(friends|family)/i.test(text)) addFlag("Payment by bank transfer/gift card", 30);
  if (/credit card|card details|bank account|ssn|social security|passport|id copy/i.test(text)) addFlag("Sensitive data requested", 25);
  if (/processing|application|registration|activation fee|pay to (register|apply)|deposit.*(secure|reserve)|payment.*(upfront|in advance)/i.test(text)) addFlag("Upfront fee / payment required", 30);
  if (/unlimited earning|guaranteed (income|salary|profit)|get rich|residual income|passive income/i.test(text)) addFlag("Too good to be true", 25);
  if (/recruiters? needed|referral (bonus|commission)|network marketing|multi[- ]level/i.test(text)) addFlag("MLM/recruiting pattern", 20);
  if (/(work|do|test|sample).*(free|without pay)|unpaid (trial|test)/i.test(text)) addFlag("Unpaid test work", 25);
  if (/urgent|start (immediately|now|today)|no interview/i.test(text)) addFlag("Urgency/pressure", 10);
  const tg = Array.from(doc.querySelectorAll('a[href*="t.me"], a[href*="wa.me"], a[href*="whatsapp"]')).length;
  if (tg > 0) addFlag("Contact via Telegram/WhatsApp", 25);
  if (signals.suspiciousSites.length > 0) addFlag("Suspicious links on the page", 25);
  let score = 10;
  for (const f of flags) score += f.severity;
  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? "red" : score >= 50 ? "orange" : score >= 30 ? "yellow" : "green";
  return { score, level, flags, signals, pageTitle: doc.title || undefined, pageUrl: (() => { try { return doc.location?.href || baseUrl; } catch { return baseUrl; } })(), checkedAt: new Date().toISOString() };
}
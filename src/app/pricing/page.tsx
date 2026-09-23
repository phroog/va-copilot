"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useLocale } from "@/lib/i18n/context";
import { UPGRADE_SLOGANS } from "@/lib/upgrade-slogans";
import { daysLeft, formatPeso, coffeeCompare } from "@/lib/sale";
import { PASSES, DAILY_PASS_POINTS, type PassKey, type DailyPassKey } from "@/lib/payments";
import { trackEvent } from "@/components/meta-pixel";

export default function PricingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [inGrace, setInGrace] = useState(false);
  const [accessUntil, setAccessUntil] = useState<string | null>(null);
  const [isPass, setIsPass] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [dailyIdx, setDailyIdx] = useState(2);
  const [sloganIdx, setSloganIdx] = useState(() => Math.floor(Math.random() * UPGRADE_SLOGANS.length));

  useEffect(() => {
    const iv = setInterval(() => setSloganIdx((i) => (i + 1) % UPGRADE_SLOGANS.length), 7000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch("/api/subscription-status")
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setCurrentPlan(d.plan ?? "free");
        setInGrace(!!d.inGrace);
        setAccessUntil(d.accessUntil ?? null);
        setIsPass(!!d.isPass);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const cancelSubscription = async () => {
    if (!confirm("Cancel your subscription? You keep access until the end of the current billing period (plus a short grace period).")) return;
    setCancelling(true);
    setMsg("");
    try {
      const r = await fetch("/api/subscription/cancel", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Cancellation failed");
      setMsg("✅ Subscription will not renew. You keep access until the end of the period.");
    } catch (e: any) {
      setMsg(e?.message || "Cancellation failed");
    } finally { setCancelling(false); }
  };

  const TIERS = [
    {
      key: "free",
      name: t("planFreeName"),
      price: t("planFreePrice"),
      orig: null,
      per: "",
      desc: t("planFreeDesc"),
      features: [t("planFreeFeature1"), t("planFreeFeature2"), t("planFreeFeature3"), t("planFreeFeature4")],
      cta: t("planFreeCta"),
      highlight: false,
      scout: { pct: 0.5, vis: 1, hint: "Hidden from the scout pool — agencies can't see you yet." },
    },
    {
      key: "basic",
      name: t("planBasicName"),
      price: "$4.99",
      orig: "$9.99",
      peso: formatPeso(4.99),
      coffee: coffeeCompare(4.99),
      per: " · 30 days",
      desc: "Prepaid — pay once, no auto-renewal. Like topping up a SIM.",
      features: [t("planBasicFeature1"), t("planBasicFeature2"), t("planBasicFeature3"), t("planBasicFeature4")],
      cta: "Top up · 30 days",
      highlight: false,
      scout: { pct: 12, vis: 3, hint: "In the Scout Pool — partner agencies can find your badge." },
    },
    {
      key: "pro",
      name: t("planProName"),
      price: "$9.99",
      orig: "$19.99",
      peso: formatPeso(9.99),
      coffee: coffeeCompare(9.99),
      per: " · 30 days",
      desc: "Prepaid — pay once, no auto-renewal. Unlimited training + Top Scout Pool.",
      features: [t("planProFeature1"), t("planProFeature2"), t("planProFeature3"), t("planProFeature4")],
      cta: "Top up · 30 days",
      highlight: true,
      scout: { pct: 34, vis: 4, hint: "Top Scout Pool — agencies review Money Club profiles first." },
    },
  ];

  const startPlan = async (plan: string) => {
    if (plan === "free") { router.push("/auth/signup"); return; }
    // Prepaid only — no subscriptions. A one-time top-up grants 30 days.
    await startPass(plan === "pro" ? "pro_1m" : "basic_1m");
  };

  const startPass = async (passKey: PassKey | DailyPassKey) => {
    const amt = PASSES[passKey as PassKey]?.amountUsd ?? DAILY_PASS_POINTS.find((p) => p.key === passKey)?.amountUsd ?? 0;
    trackEvent("AddPaymentInfo", { currency: "USD", value: amt, content_type: "product" });
    setLoadingPlan(passKey);
    setMsg("");
    try {
      const res = await fetch("/api/subscription-status");
      if (res.status === 401) { router.push("/auth/login?next=/pricing"); return; }
      const r = await fetch("/api/create-pass-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass: passKey }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      setMsg(e?.message || "Checkout failed");
    } finally { setLoadingPlan(null); }
  };

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <div className="flex justify-end -mt-6 mb-4"><LanguageDropdown /></div>
          <Link href="/" className="text-2xl">🍠</Link>
          <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-kawaii-coral/15 dark:bg-kawaii-coral/20 text-sm font-extrabold text-kawaii-coral dark:text-kawaii-pink">
            🍂 Late Summer Sale — {daysLeft()} {daysLeft() === 1 ? "day" : "days"} left
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 mt-4">{t("pricingPageTitle")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t("pricingPageSub")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TIERS.map((ti: any) => (
            <Card key={ti.key} className={`relative ${ti.highlight ? "border-2 border-kawaii-purple dark:border-kawaii-lavender shadow-sari" : "border-kawaii-lavender/30 dark:border-dark-surface"}`}>
              {ti.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-extrabold px-3 py-1 rounded-full bg-kawaii-purple text-white whitespace-nowrap">
                  ⭐ {t("mostPopular")}
                </span>
              )}
              <CardContent className="p-6 text-center">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">{ti.name}</p>
                <p className="mt-3 text-4xl font-extrabold text-slate-800 dark:text-slate-100">
                  {ti.price}
                  {ti.orig && <span className="text-base font-medium text-slate-400 line-through ml-2">{ti.orig}</span>}
                  <span className="text-sm font-medium text-slate-400">{ti.per}</span>
                </p>
                {ti.peso && <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{ti.peso}/mo</p>}
                <p className="text-xs text-slate-400 mt-1">{ti.desc}</p>
                <ul className="mt-4 space-y-1.5 text-left text-sm text-slate-600 dark:text-slate-300">
                  {ti.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-1.5"><span className="text-kawaii-purple">✓</span>{f}</li>
                  ))}
                </ul>
                {/* scout chance */}
                <div className="mt-4 rounded-xl bg-kawaii-purple/10 dark:bg-kawaii-purple/10 border border-kawaii-lavender/30 dark:border-dark-surface p-2.5 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Scout chance</p>
                    <span className="text-sm font-extrabold text-kawaii-purple dark:text-kawaii-lavender tabular-nums">{ti.scout.pct}%</span>
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= ti.scout.vis ? "bg-gradient-to-r from-kawaii-purple to-kawaii-pink" : "bg-kawaii-lavender/30 dark:bg-dark-surface"}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">{ti.scout.hint}</p>
                </div>
                {ti.coffee && <p className="mt-3 text-xs text-slate-400">☕ That's {ti.coffee}.</p>}
                <Button
                  className={`w-full mt-5 ${ti.highlight ? "" : "bg-white text-kawaii-purple border border-kawaii-purple/40 hover:bg-kawaii-lavender/20"}`}
                  onClick={() => startPlan(ti.key)}
                  disabled={loadingPlan === ti.key}
                >
                  {loadingPlan === ti.key ? t("pricingCheckout") + "…" : ti.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {msg && <p className="text-center text-sm mt-4 text-slate-600 dark:text-slate-300">{msg}</p>}

        {/* One-time passes — payable with PayPal (no recurring billing) */}
        <div className="mt-10 max-w-3xl mx-auto">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 text-center">🎟️ Prefer a one-time pass?</h2>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pay once, no auto-renewal, no cancellation needed. One-time passes also work with <b>PayPal</b>.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 mt-5">
            <div className="rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-5 text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-400">Sari Bloom Pass</p>
              <div className="mt-4 space-y-2">
                <button onClick={() => startPass("basic_1m")} disabled={loadingPlan === "basic_1m"} className="w-full h-11 rounded-xl bg-white text-kawaii-purple border border-kawaii-purple/40 hover:bg-kawaii-lavender/20 dark:bg-dark-surface font-bold text-sm squishy">
                  1 month — $4.99
                </button>
                <button onClick={() => startPass("basic_3m")} disabled={loadingPlan === "basic_3m"} className="w-full h-11 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white font-bold text-sm squishy">
                  3 months — $11.99 <span className="opacity-80 line-through">$14.97</span>
                </button>
                <p className="text-xs text-slate-400">{formatPeso(11.99)} for 3 months · {coffeeCompare(11.99)}</p>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-kawaii-purple dark:border-kawaii-lavender bg-white/70 dark:bg-dark-card/70 p-5 text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-kawaii-purple dark:text-kawaii-lavender">Sari Money Club Daily Pass</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">More days = cheaper per day. No subscription.</p>
              <div className="mt-4">
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={dailyIdx}
                  onChange={(e) => setDailyIdx(Number(e.target.value))}
                  className="w-full h-2 accent-kawaii-purple"
                />
                <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1 px-0.5">
                  <span>1d</span><span>3d</span><span>7d</span><span>14d</span><span>30d</span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-left">
                  <div>
                    <p className="text-2xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender tabular-nums">
                      ${DAILY_PASS_POINTS[dailyIdx].amountUsd.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {DAILY_PASS_POINTS[dailyIdx].days} days · ${DAILY_PASS_POINTS[dailyIdx].perDay.toFixed(2)}/day
                    </p>
                  </div>
                  <button
                    onClick={() => startPass(DAILY_PASS_POINTS[dailyIdx].key)}
                    disabled={loadingPlan === DAILY_PASS_POINTS[dailyIdx].key}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white text-sm font-extrabold squishy disabled:opacity-60"
                  >
                    Get {DAILY_PASS_POINTS[dailyIdx].days} days
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {formatPeso(DAILY_PASS_POINTS[dailyIdx].amountUsd)} total · {coffeeCompare(DAILY_PASS_POINTS[dailyIdx].amountUsd)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prepaid + scout guarantee */}
        <div className="mt-6 rounded-2xl border-2 border-kawaii-mint/50 dark:border-green-700/50 bg-green-50/70 dark:bg-green-900/10 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">🛡️</span>
          <div>
            <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
              Prepaid like a SIM — and a 100% money-back scout guarantee.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              No subscriptions, no auto-renewal, no cancellation needed. You top up, you train, it runs out.
              And if one of our <b>partner agencies scouts you</b> from your badge while you're on a paid plan,
              we give you <b>100% of your money back</b>. That's how sure we are.
            </p>
          </div>
        </div>

        {/* Scout guarantee detail */}
        <div className="mt-3 rounded-2xl border border-kawaii-purple/40 dark:border-dark-surface bg-kawaii-purple/10 dark:bg-kawaii-purple/10 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">🤝</span>
          <div>
            <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
              Scouted by a partner agency? Money back.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              We partner with real agencies that review our top VAs. If one of them picks up your profile,
              your plan is refunded in full — no forms, no fine print games.
            </p>
          </div>
        </div>

        {/* How you get hired */}
        <div className="mt-8 max-w-4xl mx-auto">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 text-center">How you get hired</h2>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-1">Play to get hired — our world-first model.</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5">
            {[
              { emoji: "🎮", t: "1 · Play missions", d: "Learn real VA skills by playing, not watching." },
              { emoji: "🏅", t: "2 · Build your badge", d: "Seal skills into a live, shareable profile." },
              { emoji: "🔎", t: "3 · Get scouted", d: "Partner agencies review top VAs in the pool." },
              { emoji: "💰", t: "4 · Get hired — or refunded", d: "Scouted? 100% of your plan back." },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-4 text-center">
                <span className="text-3xl">{s.emoji}</span>
                <p className="mt-2 font-extrabold text-slate-800 dark:text-slate-100 text-sm">{s.t}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rotating nudge for users on the free plan */}
        {!checking && (!currentPlan || currentPlan === "free") && (
          <p className="text-center text-sm font-semibold text-kawaii-purple dark:text-kawaii-lavender mt-6 italic transition-all">
            “{UPGRADE_SLOGANS[sloganIdx]}”
          </p>
        )}

        {/* Current plan + cancel */}
        {!checking && currentPlan && currentPlan !== "free" && (
          <div className="mt-8 rounded-3xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Your plan</p>
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                {currentPlan === "pro" ? t("planProName") : t("planBasicName")}
              </p>
              {isPass && accessUntil ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Pass active until {new Date(accessUntil).toLocaleDateString()} — no renewal.
                </p>
              ) : inGrace && accessUntil ? (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Access until {new Date(accessUntil).toLocaleDateString()} (grace period)
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Cancel anytime — you keep access until the end of the billing period.
                </p>
              )}
            </div>
            {!isPass && (
              <Button variant="outline" size="sm" onClick={cancelSubscription} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel subscription (no renewal)"}
              </Button>
            )}
          </div>
        )}
        <p className="text-center text-xs text-slate-400 mt-8">{t("pricingFooter")}</p>
      </div>
    </div>
  );
}
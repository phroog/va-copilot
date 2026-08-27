"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useLocale } from "@/lib/i18n/context";

export default function PricingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [inGrace, setInGrace] = useState(false);
  const [accessUntil, setAccessUntil] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch("/api/subscription-status")
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setCurrentPlan(d.plan ?? "free");
        setInGrace(!!d.inGrace);
        setAccessUntil(d.accessUntil ?? null);
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
      per: "",
      desc: t("planFreeDesc"),
      features: [t("planFreeFeature1"), t("planFreeFeature2"), t("planFreeFeature3"), t("planFreeFeature4")],
      cta: t("planFreeCta"),
      highlight: false,
    },
    {
      key: "basic",
      name: t("planBasicName"),
      price: t("planBasicPrice"),
      per: "/mo",
      desc: t("planBasicDesc"),
      features: [t("planBasicFeature1"), t("planBasicFeature2"), t("planBasicFeature3"), t("planBasicFeature4")],
      cta: t("planBasicCta"),
      highlight: false,
    },
    {
      key: "pro",
      name: t("planProName"),
      price: t("planProPrice"),
      per: "/mo",
      desc: t("planProDesc"),
      features: [t("planProFeature1"), t("planProFeature2"), t("planProFeature3"), t("planProFeature4")],
      cta: t("planProCta"),
      highlight: true,
    },
  ];

  const startPlan = async (plan: string) => {
    if (plan === "free") { router.push("/auth/signup"); return; }
    setLoadingPlan(plan);
    setMsg("");
    try {
      const res = await fetch("/api/subscription-status");
      if (res.status === 401) { router.push("/auth/login?next=/pricing"); return; }
      const r = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">{t("pricingPageTitle")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t("pricingPageSub")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TIERS.map((ti) => (
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
                  <span className="text-sm font-medium text-slate-400">{ti.per}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">{ti.desc}</p>
                <ul className="mt-4 space-y-1.5 text-left text-sm text-slate-600 dark:text-slate-300">
                  {ti.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5"><span className="text-kawaii-purple">✓</span>{f}</li>
                  ))}
                </ul>
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

        {/* Current plan + cancel */}
        {!checking && currentPlan && currentPlan !== "free" && (
          <div className="mt-8 rounded-3xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Your plan</p>
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                {currentPlan === "pro" ? t("planProName") : t("planBasicName")}
              </p>
              {inGrace && accessUntil ? (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  Access until {new Date(accessUntil).toLocaleDateString()} (grace period)
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Cancel anytime — you keep access until the end of the billing period.
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={cancelSubscription} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel subscription (no renewal)"}
            </Button>
          </div>
        )}
        <p className="text-center text-xs text-slate-400 mt-8">{t("pricingFooter")}</p>
      </div>
    </div>
  );
}
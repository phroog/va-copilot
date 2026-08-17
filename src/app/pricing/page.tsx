"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TIERS = [
  {
    key: "free",
    name: "Free",
    price: "0$",
    per: "/Monat",
    desc: "Zum Reinschnuppern",
    features: ["20 Job-Ansichten pro Tag", "Volle Job-Details + Links inklusive", "5 AI-Credits / Monat", "Scam-Ampel & Match"],
    cta: "Get Started",
    highlight: false,
  },
  {
    key: "basic",
    name: "Basic",
    price: "5$",
    per: "/Monat",
    desc: "Für aktive Jobsuche",
    features: ["100 Job-Ansichten pro Tag", "50 AI-Credits / Monat", "Pitch-Generator & Scam-Check", "CV & PDF"],
    cta: "Start Basic",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "10$",
    per: "/Monat",
    desc: "Für Profi-Freelancer",
    features: ["Unbegrenzte Job-Ansichten", "200 AI-Credits / Monat", "Alle Plattformen voll", "Alles aus Basic"],
    cta: "Start Pro",
    highlight: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/subscription-status").then(() => setChecking(false)).catch(() => setChecking(false));
  }, []);

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
      if (!r.ok) throw new Error(data?.error || "Checkout fehlgeschlagen");
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      setMsg(e?.message || "Fehlgeschlagen");
    } finally { setLoadingPlan(null); }
  };

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg">
      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl">🍠</Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">Sari Pricing</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Finde deinen nächsten Job — transparent &amp; fair.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TIERS.map((t) => (
            <Card key={t.key} className={`relative ${t.highlight ? "border-2 border-kawaii-purple dark:border-kawaii-lavender shadow-sari" : "border-kawaii-lavender/30 dark:border-dark-surface"}`}>
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-extrabold px-3 py-1 rounded-full bg-kawaii-purple text-white">
                  ⭐ Most Popular
                </span>
              )}
              <CardContent className="p-6 text-center">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">{t.name}</p>
                <p className="mt-3 text-4xl font-extrabold text-slate-800 dark:text-slate-100">
                  {t.price}
                  <span className="text-sm font-medium text-slate-400">{t.per}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">{t.desc}</p>
                <ul className="mt-4 space-y-1.5 text-left text-sm text-slate-600 dark:text-slate-300">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5"><span className="text-kawaii-purple">✓</span>{f}</li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-5 ${t.highlight ? "" : "bg-white text-kawaii-purple border border-kawaii-purple/40 hover:bg-kawaii-lavender/20"}`}
                  onClick={() => startPlan(t.key)}
                  disabled={loadingPlan === t.key}
                >
                  {loadingPlan === t.key ? "Öffne Checkout…" : t.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {msg && <p className="text-center text-sm text-red-500 mt-4">{msg}</p>}
        <p className="text-center text-xs text-slate-400 mt-8">Zahlung läuft über Stripe (Test-Modus). Kündbar jederzeit.</p>
      </div>
    </div>
  );
}
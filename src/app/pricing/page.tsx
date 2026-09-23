"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useLocale } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { PASSES, DAILY_PASS_POINTS, type PassKey, type DailyPassKey } from "@/lib/payments";
import { trackEvent } from "@/components/meta-pixel";

const WHATSAPP = "436645597889";
const WHATSAPP_DISPLAY = "+43 664 559 7889";

const FAQS = [
  { q: "How do I actually get hired?", a: "You train by playing. Every sealed skill lands on your badge. Our own agencies review the Scout Pool — the higher you climb, the harder it is to ignore you." },
  { q: "What if an agency scouts me?", a: "You get hired — and your plan is refunded 100%. That's our money-back scout guarantee, in writing." },
  { q: "Why a deposit and not a subscription?", a: "Because we hate being locked in as much as you do. One deposit, ~30 days of training, and it runs out. Like a SIM card." },
  { q: "How do I pay from the Philippines?", a: "GCash or Maya — just pick Google Pay or PayPal at checkout. No card needed." },
];

export default function PricingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const TIERS = [
    {
      key: "free",
      name: "Free",
      price: "$0",
      orig: null,
      per: "",
      desc: "Try the dream on",
      features: ["1 new chapter a day", "All your tools, unlocked", "Watch the leaderboard", "Play to Get Hired missions"],
      cta: "Start free",
      highlight: false,
      scout: { pct: 0.5, vis: 1, hint: "Hidden from the scout pool — agencies can't see you yet." },
    },
    {
      key: "basic",
      name: "BLOOM",
      price: "$4.99",
      orig: null,
      per: " · 30 days",
      desc: "Where dreams start to feel real",
      features: ["2 new chapters a day", "Client Sim grind (5 a day)", "Your badge goes live", "Into the Scout Pool", "Ranked on the board"],
      cta: "Top up · 30 days",
      highlight: false,
      scout: { pct: 12, vis: 3, hint: "In the Scout Pool — partner agencies can find your badge." },
    },
    {
      key: "pro",
      name: "Money Club",
      price: "$9.99",
      orig: null,
      per: " · 30 days",
      desc: "The stage. The spotlight. You.",
      features: ["Unlimited chapters", "Unlimited Client Sim", "Top Scout Pool — agencies see you first", "✓ Verified badge", "1:1 WhatsApp support"],
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
      {/* Interested but not sure — small, not the main focus */}
      <a
        href={`https://wa.me/${WHATSAPP}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-black text-white text-center text-[12px] font-bold py-2 hover:bg-slate-900 transition-colors"
      >
        💬 Interested but not sure? WhatsApp us — <span className="underline">{WHATSAPP_DISPLAY}</span>
      </a>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="flex justify-end -mt-4 mb-3"><LanguageDropdown /></div>
          <Link href="/" className="text-2xl">🍠</Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 mt-3">{t("pricingPageTitle")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t("pricingPageSub")}</p>
        </div>

        {/* Money-back guarantee — top, unmissable */}
        <div className="mb-8 rounded-2xl border-2 border-kawaii-mint/60 dark:border-green-700/50 bg-green-50/80 dark:bg-green-900/10 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">🛡️</span>
          <div>
            <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
              Prepaid like a SIM + a 100% money-back scout guarantee.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              No subscriptions, no auto-renewal, no cancellation needed. And if one of our{" "}
              <b>partner agencies scouts you</b> from your badge, we refund your plan <b>in full</b>.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {TIERS.map((ti: any) => {
            const isPro = ti.key === "pro";
            const isBasic = ti.key === "basic";
            return (
              <div
                key={ti.key}
                className={cn(
                  "relative rounded-[28px] p-6 overflow-hidden",
                  isPro
                    ? "bg-black text-white border border-white/20 shadow-[0_0_80px_rgba(255,200,0,0.18)]"
                    : isBasic
                    ? "bg-[#1c1833] text-white border border-kawaii-purple/50"
                    : "bg-[#101020] text-white border border-white/10"
                )}
              >
                {isPro && (
                  <>
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-kawaii-pink/30 to-transparent blur-2xl pointer-events-none" />
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-white text-black text-[10px] font-black">SPOTLIGHT</span>
                  </>
                )}
                <div className="text-center relative">
                  <p className="text-sm font-bold uppercase tracking-wider text-white/50">{ti.name}</p>
                  <p className="mt-3 text-4xl font-extrabold text-white">
                    {ti.price}
                    {ti.orig && <span className="text-base font-medium text-white/40 line-through ml-2">{ti.orig}</span>}
                    <span className="text-sm font-medium text-white/40">{ti.per}</span>
                  </p>
                  {ti.peso && <p className="text-xs font-bold text-white/50 mt-1">{ti.peso}/mo</p>}
                  <p className="text-xs text-white/55 mt-1">{ti.desc}</p>
                  <ul className="mt-4 space-y-1.5 text-left text-sm text-white/80">
                    {ti.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-1.5"><span className={isPro ? "text-kawaii-pink" : "text-kawaii-purple"}>✦</span>{f}</li>
                    ))}
                  </ul>
                  {/* scout chance */}
                  <div className="mt-4 rounded-xl bg-white/10 border border-white/15 p-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">Scout chance</p>
                      <span className="text-sm font-extrabold text-white tabular-nums">{ti.scout.pct}%</span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= ti.scout.vis ? "bg-gradient-to-r from-kawaii-purple to-kawaii-pink" : "bg-white/20"}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-white/45 mt-1.5">{ti.scout.hint}</p>
                  </div>
                  {ti.coffee && <p className="mt-3 text-xs text-white/40">☕ That's {ti.coffee}.</p>}
                  <button
                    onClick={() => startPlan(ti.key)}
                    disabled={loadingPlan === ti.key}
                    className={cn(
                      "w-full mt-5 py-3.5 rounded-2xl font-black transition-all squishy disabled:opacity-50",
                      isPro ? "bg-gradient-to-r from-kawaii-purple to-kawaii-pink text-white shadow-xl shadow-kawaii-purple/30" : "bg-white text-black hover:bg-kawaii-lavender"
                    )}
                  >
                    {loadingPlan === ti.key ? t("pricingCheckout") + "…" : ti.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {msg && <p className="text-center text-sm mt-4 text-slate-600 dark:text-slate-300">{msg}</p>}

        {/* FAQ — visible without scrolling */}
        <div className="mt-10 max-w-3xl mx-auto grid sm:grid-cols-2 gap-3">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-4">
              <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">❓ {f.q}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.a}</p>
            </div>
          ))}
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
              { emoji: "💰", t: "4 · Get hired — plan refunded", d: "Scouted? 100% of your plan back." },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-card/70 p-4 text-center">
                <span className="text-3xl">{s.emoji}</span>
                <p className="mt-2 font-extrabold text-slate-800 dark:text-slate-100 text-sm">{s.t}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pay your way */}
        <div className="mt-10 max-w-4xl mx-auto">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 text-center">Pay your way, securely</h2>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cards, Google Pay, PayPal — no subscription needed.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <PayBadge type="visa" />
            <PayBadge type="mc" />
            <PayBadge type="amex" />
            <PayBadge type="gpay" />
            <PayBadge type="paypal" />
          </div>
          <div className="mt-4 rounded-2xl border border-kawaii-purple/40 dark:border-dark-surface bg-kawaii-purple/10 dark:bg-kawaii-purple/10 px-5 py-4">
            <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">🇵🇭 From the Philippines?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              You can pay with <b>GCash</b> or <b>Maya</b> — just choose <b>Google Pay</b> or <b>PayPal</b> at
              checkout, both accept your wallet. No card needed.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <PayBadge type="gcash" />
              <PayBadge type="maya" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dl-green/15 text-dl-green text-xs font-extrabold">
                🔒 Secure checkout · Stripe · 3-D Secure · 256-bit SSL
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">{t("pricingFooter")}</p>
      </div>
    </div>
  );
}

function PayBadge({ type }: { type: "visa" | "mc" | "amex" | "gpay" | "paypal" | "gcash" | "maya" }) {
  if (type === "mc") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface font-extrabold text-xs text-slate-700 dark:text-slate-200">
        <span className="relative inline-flex">
          <span className="w-4 h-4 rounded-full bg-[#EB001B]" />
          <span className="w-4 h-4 rounded-full bg-[#F79E1B] -ml-1.5" />
        </span>
        Mastercard
      </span>
    );
  }
  const style: Record<string, string> = {
    visa: "bg-[#1A1F71] text-white",
    amex: "bg-[#2E77BC] text-white",
    gcash: "bg-[#007DFE] text-white",
    maya: "bg-gradient-to-r from-[#00a3ff] to-[#9b3df5] text-white",
  };
  const label: Record<string, string> = {
    visa: "VISA",
    amex: "AMEX",
    gcash: "GCash",
    maya: "Maya",
  };
  if (type === "visa" || type === "amex" || type === "gcash" || type === "maya") {
    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-extrabold text-xs ${style[type]}`}>
        {label[type]}
      </span>
    );
  }
  if (type === "gpay") {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface font-extrabold text-xs">
        <span className="font-black">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">o</span>
          <span className="text-[#FBBC05]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#34A853]">l</span>
          <span className="text-[#EA4335]">e</span>
        </span>
        <span className="text-slate-700 dark:text-slate-200 ml-1">Pay</span>
      </span>
    );
  }
  // paypal
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white dark:bg-dark-card border border-kawaii-lavender/30 dark:border-dark-surface font-extrabold text-xs">
      <span className="text-[#003087]">Pay</span>
      <span className="text-[#009CDE]">Pal</span>
    </span>
  );
}
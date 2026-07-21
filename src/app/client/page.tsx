"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ClientPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email) return;
    setSending(true);
    try {
      await fetch("/api/client-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      setSubmitted(true);
    } catch {} finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-[#FFF0F5] dark:bg-dark-bg overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
        <div className="blob w-96 h-96 bg-kawaii-pink top-[-10%] left-[-10%]" />
        <div className="blob w-80 h-80 bg-kawaii-purple top-[30%] right-[-15%]" />
        <div className="blob w-72 h-72 bg-kawaii-peach bottom-[20%] left-[-10%]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-kawaii-lavender/30 dark:border-dark-surface bg-white/70 dark:bg-dark-bg/70 backdrop-blur-lg">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <span className="text-xl font-extrabold bg-gradient-to-r from-sari-ube to-sari-coral bg-clip-text text-transparent">Sari</span>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">← Back</Button>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 pt-20 pb-16 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kawaii-lavender/30 dark:bg-dark-surface text-sm font-medium text-kawaii-purple dark:text-kawaii-lavender mb-6">
              🎉 For Clients — Early Access
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-slate-800 dark:text-slate-100">
              Know Exactly What Your{" "}
              <span className="bg-gradient-to-r from-kawaii-purple to-kawaii-pink bg-clip-text text-transparent">
                VA Is Doing
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Real-time transparency into your projects. See time logs, invoices, and progress — all in one simple portal. No more guessing.
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="px-4 pb-16">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { emoji: "👁️", title: "Full Transparency", desc: "See exactly what work was done and when. Every minute is accounted for." },
              { emoji: "⏱", title: "Live Time Tracking", desc: "Watch progress in real-time. Know how your budget is being spent." },
              { emoji: "📄", title: "Automated Invoices", desc: "Get professional invoices automatically generated from logged hours." },
            ].map((benefit) => (
              <Card key={benefit.title} className="text-center squishy">
                <CardContent className="p-6">
                  <div className="text-4xl mb-3">{benefit.emoji}</div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{benefit.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-extrabold text-center text-slate-800 dark:text-slate-100 mb-8">How It Works</h2>
            <div className="space-y-4">
              {[
                { step: "1", emoji: "🔗", title: "Receive Your Link", desc: "Your VA sends you a unique portal link for your project." },
                { step: "2", emoji: "👀", title: "View Progress Instantly", desc: "See time entries, invoices, and project updates — no login needed." },
                { step: "3", emoji: "✅", title: "Stay in the Loop", desc: "Get full visibility with zero effort. Always know where things stand." },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 dark:bg-dark-card/60">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-kawaii-purple to-kawaii-pink flex items-center justify-center text-white font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{item.emoji} {item.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Waitlist Form */}
        <section className="px-4 pb-20">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-xl text-center">📋 Join the Waitlist</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-6">
                  <p className="text-4xl mb-3">🎉</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">You're on the list!</p>
                  <p className="text-sm text-slate-500 mt-1">We'll notify you when client portals are ready.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={!name || !email || sending}>
                    {sending ? "Submitting..." : "📋 Join Waitlist"}
                  </Button>
                  <p className="text-xs text-center text-slate-400">No spam. Unsubscribe anytime.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="text-center pb-8 text-xs text-slate-400">
          <Link href="/" className="text-sari-ube underline">← Back to Sari</Link>
        </footer>
      </div>
    </div>
  );
}

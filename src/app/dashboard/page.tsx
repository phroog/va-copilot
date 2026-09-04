"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { useToast } from "@/components/toast";
import MoodCheckDialog from "@/components/mood-check-dialog";
import { useProfileName } from "@/lib/use-profile-name";
import { formatDuration } from "@/lib/utils";
import { formatMoney, convert, normalizeCurrency } from "@/lib/currency";
import TelegramCta from "@/components/telegram-cta";
import UpsellAd from "@/components/upsell-ad";
import StreakCard from "@/components/streak-card";
import { trackEvent } from "@/components/meta-pixel";
import ProfileReminder from "@/components/profile-reminder";

interface FeedJob {
  id: string;
  title: string;
  platform: string | null;
  budget: string | null;
  profile_match: number | null;
  scam_level: string | null;
}

interface InvoiceSummary {
  id: string;
  invoice_number: string;
  client_name: string;
  status: string;
  currency: string;
  tax_rate: number;
  invoice_items: { total: number; quantity: number; unit_price: number }[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  jobs?: { title: string } | null;
}

interface TimeEntry {
  id: string;
  description: string;
  end_time: string | null;
  start_time: string;
  hourly_rate: number;
}

const PLAN_LABELS: Record<string, string> = { free: "Sari Sprout", basic: "Sari Bloom", pro: "Sari Money Club" };

export default function DashboardHome() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const { name: userName } = useProfileName();
  const [greeting, setGreeting] = useState("");
  const [plan, setPlan] = useState("free");
  const [credits, setCredits] = useState(0);
  const [quota, setQuota] = useState<{ used?: number | null; limit?: number | null; bonus?: number }>({});
  const [monthEarnings, setMonthEarnings] = useState(0);
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [outstanding, setOutstanding] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [topMatches, setTopMatches] = useState<FeedJob[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceSummary[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [runningTimer, setRunningTimer] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);

  // Meta Pixel: fire Purchase once when returning from the Stripe checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "success") {
      trackEvent("Purchase", { currency: "USD", value: 1 });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("🌅 Good morning");
    else if (hour < 18) setGreeting("☀️ Good afternoon");
    else setGreeting("🌙 Good evening");

    const load = async () => {
      try {
        const [finRes, invRes, feedRes, timeRes, eventsRes, subRes, creditsRes] = await Promise.all([
          fetch("/api/finances"),
          fetch("/api/invoices"),
          fetch("/api/jobs/feed?limit=5&count_views=0&sort=match"),
          fetch("/api/time-entries"),
          fetch("/api/events"),
          fetch("/api/subscription-status"),
          fetch("/api/ai/credits"),
        ]);
        const fin = await finRes.json();
        const inv = await invRes.json();
        const feed = await feedRes.json();
        const time = await timeRes.json();
        const events = await eventsRes.json();
        const sub = await subRes.json();
        const cr = await creditsRes.json();

        setMonthEarnings(fin.totalMonth ?? 0);
        setBaseCurrency(normalizeCurrency(fin.baseCurrency || "EUR"));
        setTopMatches((feed.jobs ?? []).slice(0, 5));
        setQuota({ used: feed.used, limit: feed.limit, bonus: feed.bonus });
        setPlan(sub.plan ?? "free");
        setCredits(cr.balance ?? 0);

        // Outstanding = sent + overdue, converted to base currency
        const invoices: InvoiceSummary[] = inv.invoices ?? [];
        setRecentInvoices(invoices.slice(0, 3));
        let open = 0;
        for (const i of invoices) {
          if (i.status !== "sent" && i.status !== "overdue") continue;
          const subTotal = (i.invoice_items ?? []).reduce((s, it) => s + Number(it.total ?? it.quantity * it.unit_price), 0);
          const total = subTotal + subTotal * (Number(i.tax_rate) / 100);
          open += convert(total, i.currency || "USD", baseCurrency);
        }
        setOutstanding(open);
        setInvoiceCount(invoices.length);

        // Time tracking
        const entries: TimeEntry[] = time.entries ?? [];
        const running = time.running;
        setRunningTimer(running);
        if (running) setElapsed(Math.floor((Date.now() - new Date(running.start_time).getTime()) / 1000));
        const today = new Date().toDateString();
        let secs = 0;
        let earn = 0;
        for (const e of entries) {
          if (new Date(e.start_time).toDateString() !== today) continue;
          const start = new Date(e.start_time).getTime();
          const end = e.end_time ? new Date(e.end_time).getTime() : Date.now();
          const s = Math.max(0, Math.floor((end - start) / 1000));
          secs += s;
          earn += (s / 3600) * e.hourly_rate;
        }
        setTodayHours(secs);
        setTodayEarnings(earn);

        const now = new Date();
        setUpcomingEvents((events.events ?? []).filter((e: CalendarEvent) => new Date(e.start_time) > now).sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).slice(0, 3));
      } catch (e) {
        showToast((e as any)?.message ?? "Failed to load dashboard", "error");
      }
    };
    load();

    fetch("/api/mood")
      .then((r) => r.json())
      .then((data) => {
        if (data.mood) {
          const moodGreetings: Record<string, string> = {
            happy: "So glad you're feeling great today! 🎉",
            okay: "Hey, you've got this! 💪",
            tired: "Take it easy today, you deserve rest ☕",
            motivated: "Let's crush those goals today! 🔥",
            down: "Sending you a virtual hug 🫂",
          };
          setGreeting((g) => g + " — " + (moodGreetings[data.mood] ?? ""));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (runningTimer) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(runningTimer.start_time).getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runningTimer]);

  const stopTimer = async () => {
    if (!runningTimer) return;
    await fetch(`/api/time-entries/${runningTimer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ end_time: new Date().toISOString() }),
    });
    setRunningTimer(null);
  };

  const quotaPct = quota.limit ? Math.min(100, Math.round(((quota.used ?? 0) / quota.limit) * 100)) : 100;

  const stats = [
    { label: "This Month", value: formatMoney(monthEarnings, baseCurrency), emoji: "💰", color: "from-kawaii-purple to-kawaii-pink", href: "/dashboard/finances" },
    { label: "Open Invoices", value: formatMoney(outstanding, baseCurrency), emoji: "📄", color: "from-kawaii-coral to-kawaii-pink", href: "/dashboard/invoices" },
    { label: "Credits", value: String(credits), emoji: "🪙", color: "from-kawaii-peach to-kawaii-purple", href: "/dashboard/credits" },
    { label: "Tracked Today", value: formatDuration(todayHours) + (todayEarnings > 0 ? ` · ${formatMoney(todayEarnings, baseCurrency)}` : ""), emoji: "⏱", color: "from-kawaii-mint to-kawaii-purple", href: "/dashboard/time-tracker" },
  ];

  const statusColors: Record<string, string> = {
    draft: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    sent: "bg-kawaii-lavender/30 text-kawaii-purple",
    paid: "bg-kawaii-mint/30 text-green-700 dark:text-green-300",
    overdue: "bg-kawaii-coral/30 text-red-700 dark:text-red-300",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <MoodCheckDialog />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            {greeting}{userName ? ", " + userName : ""}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t("welcomeDashboard")}</p>
        </div>
        <Link href="/pricing">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-kawaii-purple/10 text-kawaii-purple dark:text-kawaii-lavender text-xs font-bold hover:bg-kawaii-purple/20 transition-all">
            {PLAN_LABELS[plan] ?? plan} Plan
            {plan !== "pro" && <span className="text-kawaii-coral">↑ Upgrade</span>}
          </span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:border-kawaii-purple/50 transition-all h-full">
              <CardContent className="p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-lg md:text-xl font-extrabold mt-1 truncate">{s.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg shrink-0`}>
                  {s.emoji}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quota + Timer */}
      <ProfileReminder />
      <StreakCard />
      <UpsellAd />
      <TelegramCta />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>🎯 Daily Quota (matching jobs)</span>
              <Link href="/dashboard/live-feed" className="text-xs text-kawaii-purple underline font-medium">Open Feed</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quota.limit == null ? (
              <p className="text-sm text-slate-500">💎 Unlimited job views (Pro)</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-300">
                    <strong>{quota.used ?? 0}</strong> of <strong>{quota.limit}</strong> matching jobs seen today
                  </span>
                  <span className="text-xs text-slate-400">
                    {quota.bonus ? `🎁 incl. +${quota.bonus} bonus` : ""}
                  </span>
                </div>
                <div className="h-3 bg-kawaii-lavender/20 dark:bg-dark-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-kawaii-purple to-kawaii-pink transition-all duration-700" style={{ width: `${quotaPct}%` }} />
                </div>
              </>
            )}
            <div className="flex gap-2 mt-4">
              <Link href="/dashboard/wheel" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">🎡 Lucky Wheel (daily)</Button>
              </Link>
              <Link href="/pricing" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">📈 More Jobs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/5 dark:to-kawaii-pink/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">⏱ Time Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            {runningTimer ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <p className="text-2xl font-extrabold text-kawaii-purple dark:text-kawaii-lavender tabular-nums">
                      {Math.floor(elapsed / 3600).toString().padStart(2, "0")}:{Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{runningTimer.description || "Tracking"}</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={stopTimer}>⏹ Stop</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Today: {formatDuration(todayHours)}{todayEarnings > 0 ? ` — ${formatMoney(todayEarnings, baseCurrency)} earned` : ""}
                  </p>
                </div>
                <Link href="/dashboard/time-tracker">
                  <Button variant="primary" size="sm">▶ Start Tracking</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top matches + Recent invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>🎯 Best Matches</span>
              <Link href="/dashboard/live-feed" className="text-xs text-kawaii-purple underline font-medium">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMatches.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No matches yet — set up your profile in the settings.</p>
            ) : (
              <div className="space-y-2">
                {topMatches.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block">
                    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 hover:bg-kawaii-lavender/30 squishy">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{job.title}</p>
                        <p className="text-xs text-slate-400">
                          {job.platform}
                          {job.budget ? ` · ${job.budget}` : ""}
                        </p>
                      </div>
                      {job.profile_match != null && (
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-kawaii-purple/10 text-kawaii-purple dark:text-kawaii-lavender shrink-0">
                          {job.profile_match}%
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>📄 Invoices</span>
              <Link href="/dashboard/invoices" className="text-xs text-kawaii-purple underline font-medium">
                {invoiceCount > 0 ? `${invoiceCount} total` : "Create invoice"}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map((inv) => {
                  const sub = (inv.invoice_items ?? []).reduce((s, it) => s + Number(it.total ?? it.quantity * it.unit_price), 0);
                  const total = sub + sub * (Number(inv.tax_rate) / 100);
                  return (
                    <Link key={inv.id} href="/dashboard/invoices" className="block">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 squishy">
                        <div>
                          <p className="font-semibold text-sm">{inv.invoice_number}</p>
                          <p className="text-xs text-slate-400">{inv.client_name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[inv.status] || statusColors.draft}`}>
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">{formatMoney(total, inv.currency)}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">📅 Upcoming events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingEvents.map((ev) => (
                <Link key={ev.id} href="/dashboard/calendar" className="block">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 squishy">
                    <div>
                      <p className="font-semibold text-sm">{ev.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(ev.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {" — "}
                        {new Date(ev.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {ev.jobs?.title ? ` · 💼 ${ev.jobs.title}` : ""}
                      </p>
                    </div>
                    <span className="text-lg">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import MoodCheckDialog from "@/components/mood-check-dialog";
import LuckyWheel from "@/components/lucky-wheel";
import DailyMotivation from "@/components/daily-motivation";
import WorldClock from "@/components/world-clock";
import QuickNotes from "@/components/quick-notes";

interface Job {
  id: string;
  title: string;
  platform: string;
  budget: string;
}

interface FollowUp {
  id: string;
  action: string;
  due_date: string;
  done: boolean;
}

interface InvoiceSummary {
  id: string;
  invoice_number: string;
  client_name: string;
  status: string;
  invoice_items: { total: number }[];
  tax_rate: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  source: string;
  meeting_link: string | null;
  jobs?: { title: string; platform: string } | null;
}

interface TimeEntry {
  id: string;
  description: string;
  end_time: string | null;
  start_time: string;
  duration: string | null;
  hourly_rate: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function DashboardHome() {
  const { t, locale } = useLocale();
  const [stats, setStats] = useState({ jobs: 0, applications: 0, interviews: 0, offers: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [greeting, setGreeting] = useState("");
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceSummary[]>([]);
  const [runningTimer, setRunningTimer] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [todaySummary, setTodaySummary] = useState({ hours: 0, earnings: 0 });

  const fetchData = async () => {
    try {
      const [jobsRes, appsRes, followsRes, timeRes, eventsRes, invoicesRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/applications"),
        fetch("/api/follow-ups"),
        fetch("/api/time-entries"),
        fetch("/api/events"),
        fetch("/api/invoices"),
      ]);
      const jobsData = await jobsRes.json();
      const appsData = await appsRes.json();
      const followsData = await followsRes.json();
      const timeData = await timeRes.json();
      const eventsData = await eventsRes.json();
      const invoicesData = await invoicesRes.json();

      const jobs = jobsData.jobs ?? [];
      const apps = appsData.applications ?? [];
      const follows = followsData.followUps ?? [];
      const entries: TimeEntry[] = timeData.entries ?? [];

      setRecentJobs(jobs.slice(0, 3));
      setFollowUps(follows.filter((f: FollowUp) => !f.done).slice(0, 5));

      const sent = apps.filter((a: any) => a.status === "sent").length;
      const interviews = apps.filter((a: any) => a.status === "interview").length;
      const offers = apps.filter((a: any) => a.status === "offer" || a.status === "won").length;

      setStats({ jobs: jobs.length, applications: sent + interviews + offers, interviews, offers });

      // Time tracking
      const running = timeData.running;
      setRunningTimer(running);
      if (running) {
        setElapsed(Math.floor((Date.now() - new Date(running.start_time).getTime()) / 1000));
      }

      // Today summary
      const today = new Date().toDateString();
      const todayEntries = entries.filter((e) => new Date(e.start_time).toDateString() === today);
      let totalSecs = 0;
      let totalEarnings = 0;
      todayEntries.forEach((e) => {
        const start = new Date(e.start_time).getTime();
        const end = e.end_time ? new Date(e.end_time).getTime() : Date.now();
        const secs = Math.floor((end - start) / 1000);
        totalSecs += secs;
        totalEarnings += (secs / 3600) * e.hourly_rate;
      });
      setTodaySummary({ hours: totalSecs, earnings: totalEarnings });

      // Upcoming events
      const allEvents: CalendarEvent[] = eventsData.events ?? [];
      const now = new Date();
      const nextEvents = allEvents
        .filter((e) => new Date(e.start_time) > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 3);
      setUpcomingEvents(nextEvents);

      // Recent invoices
      const allInvoices: InvoiceSummary[] = invoicesData.invoices ?? [];
      setRecentInvoices(allInvoices.slice(0, 3));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchData();

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("🌅 Good morning");
    else if (hour < 18) setGreeting("☀️ Good afternoon");
    else setGreeting("🌙 Good evening");

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

  // Live timer tick
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
    fetchData();
  };

  const statsCards = [
    { label: "Total Jobs", value: stats.jobs, emoji: "💼", color: "from-kawaii-purple to-kawaii-pink" },
    { label: "Applications", value: stats.applications, emoji: "📝", color: "from-kawaii-pink to-kawaii-coral" },
    { label: "Interviews", value: stats.interviews, emoji: "🎯", color: "from-kawaii-peach to-kawaii-purple" },
    { label: "Offers", value: stats.offers, emoji: "🎉", color: "from-kawaii-mint to-kawaii-purple" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <MoodCheckDialog />

      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{greeting}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t("welcomeDashboard")}</p>
      </div>

      <DailyMotivation />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-3xl font-extrabold mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl`}>
                  {s.emoji}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time Tracking Widget */}
      <Card className="bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/5 dark:to-kawaii-pink/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">⏱ Time Tracking</CardTitle>
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
                  Today: {formatDuration(todaySummary.hours)} — ${todaySummary.earnings.toFixed(2)} earned
                </p>
              </div>
              <Link href="/dashboard/time-tracker">
                <Button variant="primary" size="sm">▶ Start Tracking</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* World Clock + Quick Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorldClock />
        <QuickNotes />
      </div>

      {/* Recent Jobs + Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">💼 {t("recentJobs")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-sm text-slate-400">{t("noJobsYet")}</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-2xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 squishy">
                    <div>
                      <p className="font-semibold">{job.title}</p>
                      <p className="text-xs text-slate-400">{job.platform} — {job.budget}</p>
                    </div>
                    <span className="text-lg">→</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">📅 {t("upcomingFollowUps")}</CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-slate-400">{t("noFollowUps")}</p>
            ) : (
              <div className="space-y-3">
                {followUps.map((fu) => {
                  const due = new Date(fu.due_date);
                  const today = new Date();
                  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);
                  let badgeColor = "bg-kawaii-mint/30 text-green-700 dark:text-green-300";
                  if (diffDays < 0) badgeColor = "bg-kawaii-coral/30 text-red-700 dark:text-red-300";
                  else if (diffDays === 0) badgeColor = "bg-kawaii-peach/40 text-yellow-700 dark:text-yellow-300";

                  return (
                    <div key={fu.id} className="flex items-center justify-between p-3 rounded-2xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 squishy">
                      <div>
                        <p className="font-semibold text-sm">{fu.action}</p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                          {diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? "Today" : `In ${diffDays}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">📅 {t("upcomingEvents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <Link key={ev.id} href={`/dashboard/calendar`} className="block">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-kawaii-lavender/20 dark:bg-dark-surface/50 squishy">
                    <div>
                      <p className="font-semibold text-sm">{ev.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(ev.start_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {" — "}
                        {new Date(ev.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {ev.jobs?.title && ` · 💼 ${ev.jobs.title}`}
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

      {/* Academy Banner */}
      <Card className="bg-gradient-to-r from-kawaii-purple/10 to-kawaii-pink/10 dark:from-kawaii-purple/5 dark:to-kawaii-pink/5 border-none">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{t("academyBanner")}</p>
              <p className="text-xs text-slate-500">{t("academyBannerDesc")}</p>
            </div>
          </div>
          <Link href="/academy/dashboard">
            <Button variant="primary" size="sm">🎓 {t("learnMore")}</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      {recentInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">📊 {t("recentInvoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.map((inv) => {
                const sub = (inv.invoice_items ?? []).reduce((s, i) => s + Number(i.total || 0), 0);
                const total = sub + sub * (Number(inv.tax_rate) / 100);
                const statusColors: Record<string, string> = { draft: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300", sent: "bg-kawaii-lavender/30 text-kawaii-purple", paid: "bg-kawaii-mint/30 text-green-700 dark:text-green-300", overdue: "bg-kawaii-coral/30 text-red-700 dark:text-red-300" };
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
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">${total.toFixed(2)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lucky Wheel */}
      <LuckyWheel />
    </div>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { setupWebPush, sendToSubs } from "@/lib/push-server";

// Reminder push notifications (like Duolingo's nags). Runs on a Vercel cron
// (see vercel.json) and decides, per user with a push subscription:
//   - subscription is ending / has ended
//   - daily streak is at risk (no activity today, evening window)
//   - no grind yet today (cooldown-gated so it nudges but doesn't spam)
// Rate-limited to a couple of pushes per user per day.

const GRIND_MESSAGES = [
  "Your path is waiting — a 3-minute mission keeps the momentum ⚡",
  "Client Sim is open — easy XP while it's quiet 💬",
  "Quick grind? The bots are moving on the leaderboard 🏆",
  "One lesson today keeps your streak alive 🔥",
  "Your skills are getting dusty — knock one out 😄",
];

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ceilDays(ms: number): number {
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

interface ReminderRow {
  kind: string;
  day: string | null;
  day_count: number;
  last_sent_at: string | null;
}

export async function GET(request: Request) {
  if (!setupWebPush()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const dry = url.searchParams.get("dry") === "1";
  const force = url.searchParams.get("force") === "1";
  // lazy = only the requesting user is evaluated (client-side fallback check);
  // it's auth-gated, so it doesn't need the shared secret.
  const lazy = url.searchParams.get("lazy") === "1";

  const secret = process.env.CRON_SECRET;
  if (secret && !lazy && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const now = new Date();
  const today = utcDay(now);
  const hour = now.getUTCHours();

  let userIds: string[];
  if (lazy) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userIds = [user.id];
  } else {
    const { data: allSubs } = await admin.from("push_subscriptions").select("user_id");
    userIds = (allSubs ?? []).map((s) => s.user_id);
    if (userIds.length === 0) return NextResponse.json({ checked: 0, sent: 0 });
  }

  const { data: subs } = await admin.from("push_subscriptions").select("user_id, endpoint, keys").in("user_id", userIds);
  if (!subs || subs.length === 0) return NextResponse.json({ checked: userIds.length, sent: 0 });
  const [profilesRes, plansRes, remindersRes] = await Promise.all([
    admin.from("profiles").select("user_id, streak_count, last_active_date").in("user_id", userIds),
    admin.from("subscriptions").select("user_id, plan, status, access_until").in("user_id", userIds),
    admin.from("push_reminders").select("user_id, kind, day, day_count, last_sent_at").in("user_id", userIds),
  ]);

  const profiles = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const plans = new Map((plansRes.data ?? []).map((p) => [p.user_id, p]));
  const reminders = new Map<string, Map<string, ReminderRow>>();
  for (const r of remindersRes.data ?? []) {
    if (!reminders.has(r.user_id)) reminders.set(r.user_id, new Map());
    reminders.get(r.user_id)!.set(r.kind, r);
  }

  const byKind: Record<string, number> = {};
  let sent = 0;
  const toSend: { userId: string; subs: typeof subs; kind: string; title: string; body: string; url: string }[] = [];

  for (const userId of userIds) {
    const profile = profiles.get(userId);
    const plan = plans.get(userId);
    const userReminders = reminders.get(userId) ?? new Map<string, ReminderRow>();
    const todayCount = Array.from(userReminders.values()).reduce((s, r) => s + (r.day === today ? r.day_count : 0), 0);

    // 1. Subscription ending / expired.
    if (plan?.plan && plan.plan !== "free" && plan.access_until) {
      const accessUntil = new Date(plan.access_until).getTime();
      const daysLeft = ceilDays(accessUntil - now.getTime());
      const row = userReminders.get("sub_ending") ?? userReminders.get("sub_expired");
      const alreadyToday = row?.day === today && !force;
      if (daysLeft <= 0 && !alreadyToday) {
        toSend.push({ userId, subs: subs.filter((s) => s.user_id === userId), kind: "sub_expired", title: "Sari 💜", body: "Your plan expired — come back, your skills miss you!", url: "/pricing" });
      } else if (daysLeft > 0 && daysLeft <= 3 && !alreadyToday) {
        toSend.push({ userId, subs: subs.filter((s) => s.user_id === userId), kind: "sub_ending", title: "Sari 💜", body: `Your plan ends in ${daysLeft} day${daysLeft > 1 ? "s" : ""} — renew to keep climbing!`, url: "/pricing" });
      }
    }

    // 2. Streak at risk (evening window, no activity today).
    const streak = profile?.streak_count ?? 0;
    const lastActive = profile?.last_active_date ?? null;
    if (streak > 0 && lastActive !== today && hour >= 16) {
      const row = userReminders.get("streak_risk");
      const alreadyToday = row?.day === today && !force;
      if (!alreadyToday) {
        const hLeft = 24 - hour;
        toSend.push({ userId, subs: subs.filter((s) => s.user_id === userId), kind: "streak_risk", title: "🔥 Streak alert", body: `Your ${streak}-day streak ends in ${hLeft}h — one mission saves it!`, url: "/learn" });
      }
    }

    // 3. No grind yet today (cooldown: ≥4h between, ≤2/day, morning→evening window).
    const grindRow = userReminders.get("grind");
    const grindOk =
      hour >= 8 &&
      hour <= 21 &&
      (!grindRow ||
        (grindRow.day !== today && grindRow.day_count < 2) ||
        (grindRow.day === today && grindRow.day_count < 2 && now.getTime() - new Date(grindRow.last_sent_at ?? 0).getTime() >= 4 * 3_600_000) ||
        force);
    const hadStreakPushToday = Array.from(userReminders.values()).some((r) => (r.kind === "streak_risk" || r.kind === "sub_ending" || r.kind === "sub_expired") && r.day === today);
    if (lastActive !== today && grindOk && !hadStreakPushToday && todayCount < 2) {
      toSend.push({ userId, subs: subs.filter((s) => s.user_id === userId), kind: "grind", title: "Sari ⚡", body: GRIND_MESSAGES[Math.floor(Math.random() * GRIND_MESSAGES.length)], url: "/learn" });
    }
  }

  // Cap at 2 pushes/user/day (unless force).
  const sentTodayByUser = new Map<string, number>();
  for (const item of toSend) {
    const n = sentTodayByUser.get(item.userId) ?? 0;
    if (!force && n >= 2) continue;
    sentTodayByUser.set(item.userId, n + 1);
    if (!dry) {
      await sendToSubs(admin, item.subs as any, item.title, item.body, item.url);
      await admin.from("push_reminders").upsert(
        { user_id: item.userId, kind: item.kind, last_sent_at: now.toISOString(), day: today, day_count: 1 },
        { onConflict: "user_id,kind" }
      );
    }
    byKind[item.kind] = (byKind[item.kind] ?? 0) + 1;
    sent += item.subs.length;
  }

  return NextResponse.json({ checked: userIds.length, sent, byKind, dry });
}
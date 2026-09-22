import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp, rankFromXp } from "@/lib/learn/ranks";
import { botDisplay, dailyNewBots, type BotRow } from "@/lib/learn/bots";
import { planFromSubscription, type PlanKey } from "@/lib/learn/energy";

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  isBot: boolean;
  isYou: boolean;
  isNew?: boolean;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profileRes, topUsersRes, botsRes, subRes, paidUsersCountRes] = await Promise.all([
    supabase.from("profiles").select("xp,full_name,streak_count").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("user_id,full_name,xp").gt("xp", 0).order("xp", { ascending: false }).limit(50),
    supabase.from("leaderboard_bots").select("id,name,avatar,base_xp").order("base_xp", { ascending: false }),
    supabase.from("subscriptions").select("plan,status,access_until").eq("user_id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("user_id", { count: "exact", head: true }).in("plan", ["basic", "pro"]).in("status", ["active", "trialing"]),
  ]);

  const plan = planFromSubscription(subRes.data);
  const ineligible = plan === "free"; // FREE can view but not compete.

  const userXp = profileRes.data?.xp ?? 0;
  const userRank = rankFromXp(userXp);
  const userName = profileRes.data?.full_name || user.email?.split("@")[0] || "You";
  const streak = profileRes.data?.streak_count ?? 0;

  // Only paid users (BLOOM+) participate as real competitors.
  const topUsers = (topUsersRes.data ?? []) as { user_id: string; full_name: string; xp: number }[];
  const topUserIds = topUsers.map((u) => u.user_id);
  const { data: topSubs } = await supabase
    .from("subscriptions")
    .select("user_id,plan,status,access_until")
    .in("user_id", topUserIds);
  const paidIds = new Set(
    (topSubs ?? []).filter((s) => planFromSubscription(s) !== "free").map((s) => s.user_id)
  );
  const eligibleUsers = ineligible ? topUsers.filter((u) => paidIds.has(u.user_id)) : topUsers;

  const entries: LeaderboardEntry[] = [];

  // All seeded bots (2,000+) — rank counts every one of them.
  const allBots = ((botsRes.data ?? []) as BotRow[]).map((bot) => ({ ...botDisplay(bot), isYou: false }));
  const daily = dailyNewBots().map((nb) => ({ ...nb, isYou: false }));

  // Only show a slice of the board: the top bots + the few around the user.
  const sortedBots = [...allBots].sort((a, b) => b.xp - a.xp);
  const topBots = sortedBots.slice(0, 40);
  const ui = sortedBots.findIndex((b) => b.xp <= userXp);
  const around: LeaderboardEntry[] = [];
  if (ui >= 0) {
    around.push(...sortedBots.slice(Math.max(0, ui - 3), ui), ...sortedBots.slice(ui, ui + 4));
  }
  const displayBots: LeaderboardEntry[] = [];
  const seenBots = new Set<string>();
  for (const b of [...topBots, ...around]) {
    if (seenBots.has(b.id)) continue;
    seenBots.add(b.id);
    displayBots.push(b);
  }

  for (const b of displayBots) entries.push(b);
  for (const nb of daily) entries.push(nb);

  for (const u of eligibleUsers) {
    entries.push({
      id: u.user_id,
      name: u.full_name || "VA",
      avatar: rankFromXp(u.xp).emoji,
      xp: u.xp,
      isBot: false,
      isYou: !ineligible && u.user_id === user.id,
    });
  }

  // Deduplicate (a user could theoretically collide with a bot id — unlikely, but safe).
  const seen = new Set<string>();
  const merged = entries.filter((e) => {
    const key = e.isBot ? `bot:${e.id}` : `user:${e.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  merged.sort((a, b) => b.xp - a.xp);

  // User rank among everyone (1-based) — out of 2,000+ competitors.
  const higherBots = [...allBots, ...daily].filter((b) => b.xp > userXp).length;
  const higherUsers = eligibleUsers.filter((u) => u.xp > userXp && u.user_id !== user.id).length;
  const userRankOverall = ineligible ? null : 1 + higherBots + higherUsers;

  // If the user is competing and isn't in the top list, append their own row.
  if (!ineligible) {
    const inList = merged.some((e) => e.isYou);
    if (!inList) {
      merged.push({ id: user.id, name: userName, avatar: userRank.emoji, xp: userXp, isBot: false, isYou: true });
    }
  }

  const totalPlayers = (paidUsersCountRes.count ?? 0) + allBots.length + daily.length;

  return NextResponse.json({
    entries: merged.slice(0, 100),
    user: { ...summarizeXp(userXp), streak, name: userName, rank: userRankOverall, ineligible, plan },
    totalPlayers,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp, rankFromXp } from "@/lib/learn/ranks";
import { botDisplay, type BotRow } from "@/lib/learn/bots";

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  isBot: boolean;
  isYou: boolean;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profileRes, topUsersRes, botsRes, higherUsersCountRes] = await Promise.all([
    supabase.from("profiles").select("xp,full_name,streak_count").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("user_id,full_name,xp").gt("xp", 0).order("xp", { ascending: false }).limit(50),
    supabase.from("leaderboard_bots").select("*").order("base_xp", { ascending: false }),
    supabase.from("profiles").select("xp", { count: "exact", head: true }).gt("xp", 0),
  ]);

  const userXp = profileRes.data?.xp ?? 0;
  const userRank = rankFromXp(userXp);
  const userName = profileRes.data?.full_name || user.email?.split("@")[0] || "You";
  const streak = profileRes.data?.streak_count ?? 0;

  const entries: LeaderboardEntry[] = [];

  for (const bot of (botsRes.data ?? []) as BotRow[]) {
    const d = botDisplay(bot);
    entries.push({ id: d.id, name: d.name, avatar: d.avatar, xp: d.xp, isBot: true, isYou: false });
  }

  for (const u of (topUsersRes.data ?? []) as { user_id: string; full_name: string; xp: number }[]) {
    entries.push({
      id: u.user_id,
      name: u.full_name || "VA",
      avatar: rankFromXp(u.xp).emoji,
      xp: u.xp,
      isBot: false,
      isYou: u.user_id === user.id,
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

  // User rank among everyone (1-based).
  const higherBots = (botsRes.data ?? []).filter((b: BotRow) => botDisplay(b).xp > userXp).length;
  const higherUsers = (topUsersRes.data ?? []).filter((u: any) => u.xp > userXp && u.user_id !== user.id).length;
  const userRankOverall = 1 + higherBots + higherUsers;

  // If the user isn't in the top list, append their own row for the board.
  const inList = merged.some((e) => e.isYou);
  if (!inList) {
    merged.push({ id: user.id, name: userName, avatar: userRank.emoji, xp: userXp, isBot: false, isYou: true });
  }

  return NextResponse.json({
    entries: merged.slice(0, 100),
    user: { ...summarizeXp(userXp), streak, name: userName, rank: userRankOverall },
    totalPlayers: higherUsersCountRes.count ?? 0,
  });
}

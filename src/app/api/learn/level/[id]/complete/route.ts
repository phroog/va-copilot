import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp } from "@/lib/learn/ranks";
import { ensureProfile } from "@/lib/learn/profile";

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const levelId = params.id;
  const body = await request.json().catch(() => ({}));
  const stars = clamp(Math.round(body.stars ?? 0), 0, 3);
  const accuracy = clamp(body.accuracy ?? 0, 0, 1);

  const { data: level } = await supabase.from("learn_levels").select("*").eq("id", levelId).maybeSingle();
  if (!level) return NextResponse.json({ error: "Level not found" }, { status: 404 });
  const { data: node } = await supabase.from("skill_nodes").select("*").eq("id", level.node_id).maybeSingle();

  // Existing progress + profile.
  const profile = await ensureProfile(supabase, user.id);
  const { data: existing } = await supabase.from("learn_progress").select("*").eq("user_id", user.id).eq("level_id", levelId).maybeSingle();
  const firstCompletion = !existing || existing.status !== "completed";

  // XP: awarded once, scaled by accuracy (floor at 50% of the reward).
  const xpAward = firstCompletion
    ? Math.max(Math.round(level.xp_reward * (0.5 + 0.5 * accuracy)), Math.round(level.xp_reward * 0.5))
    : 0;

  const newStars = Math.max(stars, existing?.stars ?? 0);

  // Upsert progress.
  const { error: progError } = await supabase.from("learn_progress").upsert(
    {
      user_id: user.id,
      level_id: levelId,
      node_id: level.node_id,
      status: "completed",
      stars: newStars,
      xp_earned: firstCompletion ? xpAward : existing?.xp_earned ?? xpAward,
      attempts: (existing?.attempts ?? 0) + 1,
      completed_at: existing?.completed_at ?? new Date().toISOString(),
    },
    { onConflict: "user_id,level_id" }
  );
  if (progError) return NextResponse.json({ error: progError.message }, { status: 500 });

  // Apply XP to profile.
  const beforeXp = profile?.xp ?? 0;
  const newXp = beforeXp + xpAward;
  if (xpAward > 0) {
    await supabase.from("profiles").update({ xp: newXp }).eq("user_id", user.id);
  }

  // Streak: bump if this is the first activity today.
  let streak = profile?.streak_count ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const lastActive = profile?.last_active_date ?? null;
  if (lastActive !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    streak = lastActive === yesterday ? streak + 1 : 1;
    await supabase.from("profiles").update({ streak_count: streak, last_active_date: today }).eq("user_id", user.id);
  }

  // Rank-up detection.
  const before = summarizeXp(beforeXp);
  const after = summarizeXp(newXp);
  const rankUp =
    after.rankTitle !== before.rankTitle || after.level !== before.level
      ? { from: before.rankTitle, to: after.rankTitle, levelBefore: before.level, levelAfter: after.level }
      : null;

  // Nodes newly unlocked: children of this node whose parent is now done.
  let unlockedNodes: { id: string; title: string; emoji: string }[] = [];
  if (node && firstCompletion) {
    const { data: children } = await supabase
      .from("skill_nodes")
      .select("id,title,emoji")
      .eq("parent_id", node.id);
    unlockedNodes = children ?? [];
  }

  return NextResponse.json({
    success: true,
    xp_earned: xpAward,
    stars: newStars,
    firstCompletion,
    user: { ...after, streak },
    rankUp,
    unlockedNodes,
  });
}

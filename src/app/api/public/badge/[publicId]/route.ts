import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { summarizeXp } from "@/lib/learn/ranks";
import { accuracyTier, speedTier } from "@/lib/learn/performance";
import { sortNodes } from "@/lib/learn/gate";
import type { VaPath } from "@/lib/learn/types";

// Public badge data for a shareable profile link. No auth required — the
// service role reads only the fields that belong on a public business card.
export async function GET(_req: Request, { params }: { params: { publicId: string } }) {
  const publicId = decodeURIComponent(params.publicId).trim();
  if (!publicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createServiceRoleClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("user_id,full_name,xp,streak_count,badge_activities,badge_projects")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [progressRes, pathsRes, nodesRes, levelsRes] = await Promise.all([
    admin.from("learn_progress").select("level_id,node_id,status,stars").eq("user_id", profile.user_id).eq("status", "completed"),
    admin.from("va_paths").select("*").eq("is_active", true).order("order_index"),
    admin.from("skill_nodes").select("*"),
    admin.from("learn_levels").select("id,node_id"),
  ]);

  const xp = profile.xp ?? 0;
  const rankInfo = summarizeXp(xp);

  // Performance (best ever across completed lessons).
  const completed = progressRes.data ?? [];
  const levelsByNode = new Map<string, string[]>();
  for (const l of levelsRes.data ?? []) {
    if (!levelsByNode.has(l.node_id)) levelsByNode.set(l.node_id, []);
    levelsByNode.get(l.node_id)!.push(l.id);
  }
  const completedLevelIds = new Set(completed.map((p) => p.level_id));

  const paths = (pathsRes.data ?? []) as VaPath[];
  const nodes = (nodesRes.data ?? []) as any[];
  const specialties: { emoji: string; title: string; pct: number; sealed: boolean }[] = [];

  let masteredTotal = 0;
  let totalNodes = 0;
  for (const path of paths) {
    const pathNodes = sortNodes(nodes.filter((n) => n.path_id === path.id));
    let done = 0;
    for (const node of pathNodes) {
      const ids = levelsByNode.get(node.id) ?? [];
      if (ids.length === 0) continue;
      totalNodes++;
      if (ids.every((id) => completedLevelIds.has(id))) {
        done++;
        masteredTotal++;
      }
    }
    if (done > 0) {
      specialties.push({
        emoji: path.emoji,
        title: path.title,
        pct: done / Math.max(pathNodes.length, 1),
        sealed: done >= pathNodes.length,
      });
    }
  }
  const overallPct = totalNodes > 0 ? masteredTotal / totalNodes : 0;

  // Performance tiers.
  const rows = await admin
    .from("learn_progress")
    .select("best_accuracy,best_speed_ratio")
    .eq("user_id", profile.user_id)
    .eq("status", "completed");
  const perfRows = rows.data ?? [];
  const lessonsDone = perfRows.length;
  const avgAccuracy = lessonsDone > 0 ? perfRows.reduce((s, r) => s + Number(r.best_accuracy ?? 0), 0) / lessonsDone : 0;
  const bestRatio = lessonsDone > 0 ? Math.min(...perfRows.map((r) => Number(r.best_speed_ratio ?? 1.5))) : 1.5;

  return NextResponse.json({
    name: profile.full_name || "Virtual Assistant",
    publicId,
    xp,
    level: rankInfo.level,
    rankEmoji: rankInfo.rankEmoji,
    rankTitle: rankInfo.rankTitle,
    streak: profile.streak_count ?? 0,
    overall: { pct: overallPct, mastered: masteredTotal, total: totalNodes },
    specialties,
    stats: {
      lessonsDone,
      bestSpeedTier: speedTier(bestRatio).key,
      bestAccuracyTier: accuracyTier(avgAccuracy).key,
    },
    portfolio: {
      activities: (profile.badge_activities ?? []) as string[],
      projects: (profile.badge_projects ?? []) as string[],
    },
  });
}
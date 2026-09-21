import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp } from "@/lib/learn/ranks";
import { isPaidUser, nodeRequiresPaid, sortNodes } from "@/lib/learn/gate";
import { fingerprintId } from "@/lib/learn/tree-gen";
import type { PathWithNodes, NodeWithStatus, SkillNode, LearnLevel, UserProgressRow, VaPath } from "@/lib/learn/types";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pathsRes, nodesRes, levelsRes, progressRes, profileRes, subRes] = await Promise.all([
    supabase.from("va_paths").select("*").eq("is_active", true).order("order_index"),
    supabase.from("skill_nodes").select("*"),
    // Only what's needed to group/sort and hand out nextLevelId + XP refs.
    supabase.from("learn_levels").select("id,node_id,order_index,xp_reward"),
    supabase.from("learn_progress").select("level_id,node_id,status,stars,xp_earned,attempts,completed_at").eq("user_id", user.id),
    supabase.from("profiles").select("xp,active_path_id,streak_count,last_active_date").eq("user_id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("plan,status,access_until").eq("user_id", user.id).maybeSingle(),
  ]);

  const paths = (pathsRes.data ?? []) as VaPath[];
  const allNodes = (nodesRes.data ?? []) as SkillNode[];
  const levels = (levelsRes.data ?? []) as LearnLevel[];
  const progress = (progressRes.data ?? []) as UserProgressRow[];
  const paid = isPaidUser(subRes.data);
  const xp = profileRes.data?.xp ?? 0;

  const nodesById = new Map(allNodes.map((n) => [n.id, n]));
  const progressByLevel = new Map(progress.map((p) => [p.level_id, p]));
  const levelsByNode = new Map<string, LearnLevel[]>();
  for (const l of levels) {
    if (!levelsByNode.has(l.node_id)) levelsByNode.set(l.node_id, []);
    levelsByNode.get(l.node_id)!.push(l);
  }

  const result: PathWithNodes[] = paths.map((path) => {
    const pathNodes = sortNodes(allNodes.filter((n) => n.path_id === path.id));
    const completedNodeIds = new Set<string>();

    const withStatus: NodeWithStatus[] = pathNodes
      .map((node, pathIndex): NodeWithStatus => {
        const nodeLevels = (levelsByNode.get(node.id) ?? []).sort((a, b) => a.order_index - b.order_index);
        const completedLevels = nodeLevels.filter((l) => progressByLevel.get(l.id)?.status === "completed");
        const nodeCompleted = nodeLevels.length > 0 && completedLevels.length === nodeLevels.length;

        const parentDone = !node.parent_id || completedNodeIds.has(node.parent_id);
        const requiresPaid = nodeRequiresPaid(pathIndex) && !paid;

        let status: NodeWithStatus["status"] = "locked";
        if (nodeCompleted) status = "completed";
        else if (parentDone && !requiresPaid) status = "available";

        if (nodeCompleted) completedNodeIds.add(node.id);

        const xp_earned = nodeLevels.reduce((s, l) => s + (progressByLevel.get(l.id)?.xp_earned ?? 0), 0);
        const stars = nodeLevels.reduce((s, l) => s + (progressByLevel.get(l.id)?.stars ?? 0), 0);
        const nextLevel = nodeLevels.find((l) => progressByLevel.get(l.id)?.status !== "completed") ?? nodeLevels[0] ?? null;

        // Slim node: only the fields the clients actually render. The full
        // skill tree is big (thousands of nodes), so we keep it lean.
        return {
          id: node.id,
          parent_id: node.parent_id,
          depth: node.depth,
          order_index: node.order_index,
          title: node.title,
          subtitle: node.subtitle,
          emoji: node.emoji,
          status,
          requiresPaid: requiresPaid && !nodeCompleted,
          progress: { stars, xp_earned, completed: nodeCompleted },
          levels: nodeLevels.map((l) => ({ id: l.id, xp_reward: l.xp_reward })),
          lessonDone: completedLevels.length,
          lessonTotal: nodeLevels.length,
          nextLevelId: nextLevel?.id ?? null,
        };
      });

    return {
      ...path,
      nodes: withStatus,
      completedNodes: withStatus.filter((n) => n.status === "completed").length,
      totalNodes: withStatus.length,
      fingerprint: fingerprintId(withStatus),
    };
  });

  return NextResponse.json({
    paths: result,
    activePathId: profileRes.data?.active_path_id ?? null,
    user: { ...summarizeXp(xp), streak: profileRes.data?.streak_count ?? 0, lastActive: profileRes.data?.last_active_date ?? null },
    paid,
  });
}
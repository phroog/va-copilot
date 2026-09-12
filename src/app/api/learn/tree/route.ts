import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp } from "@/lib/learn/ranks";
import { isPaidUser, sortNodes, nodeRequiresPaid } from "@/lib/learn/gate";
import type { PathWithNodes, NodeWithStatus, SkillNode, LearnLevel, UserProgressRow } from "@/lib/learn/types";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pathsRes, nodesRes, levelsRes, progressRes, profileRes, subRes] = await Promise.all([
    supabase.from("va_paths").select("*").eq("is_active", true).order("order_index"),
    supabase.from("skill_nodes").select("*"),
    supabase.from("learn_levels").select("id,node_id,title,subtitle,order_index,xp_reward,duration_minutes,status"),
    supabase.from("learn_progress").select("level_id,node_id,status,stars,xp_earned,attempts,completed_at").eq("user_id", user.id),
    supabase.from("profiles").select("xp,active_path_id,streak_count").eq("user_id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("plan,status,access_until").eq("user_id", user.id).maybeSingle(),
  ]);

  const paths = pathsRes.data ?? [];
  const nodes = (nodesRes.data ?? []) as SkillNode[];
  const levels = (levelsRes.data ?? []) as LearnLevel[];
  const progress = (progressRes.data ?? []) as UserProgressRow[];
  const paid = isPaidUser(subRes.data);
  const xp = profileRes.data?.xp ?? 0;

  const progressByLevel = new Map(progress.map((p) => [p.level_id, p]));
  const levelsByNode = new Map<string, LearnLevel[]>();
  for (const l of levels) {
    if (!levelsByNode.has(l.node_id)) levelsByNode.set(l.node_id, []);
    levelsByNode.get(l.node_id)!.push(l);
  }

  const result: PathWithNodes[] = paths.map((path) => {
    const pathNodes = sortNodes(nodes.filter((n) => n.path_id === path.id));
    const completedNodeIds = new Set<string>();

    const withStatus: NodeWithStatus[] = pathNodes.map((node, idx) => {
      const nodeLevels = (levelsByNode.get(node.id) ?? []).sort((a, b) => a.order_index - b.order_index);
      const completedLevels = nodeLevels.filter((l) => progressByLevel.get(l.id)?.status === "completed");
      const nodeCompleted = nodeLevels.length > 0 && completedLevels.length === nodeLevels.length;

      const parentDone = !node.parent_id || completedNodeIds.has(node.parent_id);
      const requiresPaid = nodeRequiresPaid(idx) && !paid;

      let status: NodeWithStatus["status"] = "locked";
      if (nodeCompleted) status = "completed";
      else if (parentDone && !requiresPaid) status = "available";

      if (nodeCompleted) completedNodeIds.add(node.id);

      const xp_earned = nodeLevels.reduce((s, l) => s + (progressByLevel.get(l.id)?.xp_earned ?? 0), 0);
      const stars = nodeLevels.reduce((s, l) => s + (progressByLevel.get(l.id)?.stars ?? 0), 0);

      return {
        ...node,
        status,
        requiresPaid: requiresPaid && !nodeCompleted,
        progress: { stars, xp_earned, completed: nodeCompleted },
        levels: nodeLevels,
      };
    });

    return {
      ...path,
      nodes: withStatus,
      completedNodes: withStatus.filter((n) => n.status === "completed").length,
      totalNodes: withStatus.length,
    };
  });

  return NextResponse.json({
    paths: result,
    activePathId: profileRes.data?.active_path_id ?? null,
    user: { ...summarizeXp(xp), streak: profileRes.data?.streak_count ?? 0 },
    paid,
  });
}

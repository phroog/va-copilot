import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp } from "@/lib/learn/ranks";
import { isPaidUser, nodeRequiresPaid } from "@/lib/learn/gate";
import { getUserTree } from "@/lib/learn/user-tree";
import { getOrGenerateLevel } from "@/lib/learn/level-gen";
import type { LearnLevel, SkillNode, VaPath } from "@/lib/learn/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const levelId = params.id;

  const { data: level } = await supabase.from("learn_levels").select("*").eq("id", levelId).maybeSingle();
  if (!level) return NextResponse.json({ error: "Level not found" }, { status: 404 });

  const { data: node } = await supabase.from("skill_nodes").select("*").eq("id", level.node_id).maybeSingle();
  if (!node) return NextResponse.json({ error: "Node not found" }, { status: 404 });

  const { data: path } = await supabase.from("va_paths").select("*").eq("id", node.path_id).maybeSingle();

  // The node's position/parent comes from THIS user's unique tree.
  const { data: pathNodes } = await supabase.from("skill_nodes").select("*").eq("path_id", node.path_id);
  const tree = await getUserTree(supabase, user.id, path as VaPath, (pathNodes ?? []) as SkillNode[]);
  const entry = tree.find((e) => e.node_id === node.id);
  const parentId = entry?.parent_id ?? node.parent_id;
  const depth = entry?.depth ?? node.depth;

  const [subRes, profileRes] = await Promise.all([
    supabase.from("subscriptions").select("plan,status,access_until").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("xp,streak_count").eq("user_id", user.id).maybeSingle(),
  ]);

  const paid = isPaidUser(subRes.data);

  // Compute the parent's completion EXACTLY like the tree does: a node is done
  // when ALL of its levels are completed. We also accept a completed progress
  // row that references the parent node directly, so stale/inconsistent data
  // can never lock a node the tree shows as unlocked.
  const nodeIds = (pathNodes ?? []).map((n) => n.id);
  const [levelsRes, progRes] = await Promise.all([
    nodeIds.length ? supabase.from("learn_levels").select("id,node_id").in("node_id", nodeIds) : Promise.resolve({ data: [] as any[] }),
    supabase.from("learn_progress").select("level_id,node_id,status").eq("user_id", user.id),
  ]);
  const completedLevelIds = new Set((progRes.data ?? []).filter((p: any) => p.status === "completed").map((p: any) => p.level_id));
  const levelsByNode = new Map<string, string[]>();
  for (const l of (levelsRes.data ?? []) as { id: string; node_id: string }[]) {
    if (!levelsByNode.has(l.node_id)) levelsByNode.set(l.node_id, []);
    levelsByNode.get(l.node_id)!.push(l.id);
  }
  const isNodeCompleted = (id: string) => {
    const ls = levelsByNode.get(id) ?? [];
    return ls.length > 0 && ls.every((lid) => completedLevelIds.has(lid));
  };

  let parentDone = true;
  if (parentId) {
    const viaLevels = isNodeCompleted(parentId);
    const viaRow = (progRes.data ?? []).some((p: any) => p.status === "completed" && p.node_id === parentId);
    parentDone = viaLevels || viaRow;
  }

  // Gate: parent must be done, and paid-gated depths need a subscription.
  if (!parentDone) {
    return NextResponse.json({ locked: true, reason: "parent", requiresPaid: false }, { status: 403 });
  }
  if (nodeRequiresPaid(depth) && !paid) {
    return NextResponse.json({ locked: true, reason: "paid", requiresPaid: true }, { status: 402 });
  }

  const content = await getOrGenerateLevel(user.id, level as LearnLevel, node as SkillNode, (path as VaPath) ?? null);

  return NextResponse.json({
    level: { ...level, content },
    node: { ...node, parent_id: parentId, depth },
    path,
    user: { ...summarizeXp(profileRes.data?.xp ?? 0), streak: profileRes.data?.streak_count ?? 0 },
    paid,
  });
}
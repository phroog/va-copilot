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

  // Parent is "done" when ALL of its levels are completed — computed the same
  // way the tree marks a node completed (by level_id, not node_id, so stale or
  // inconsistent node_id rows can't lock a legitimately-unlocked level).
  let parentDone = true;
  if (parentId) {
    const { data: parentLevels } = await supabase.from("learn_levels").select("id").eq("node_id", parentId);
    const parentLevelIds = (parentLevels ?? []).map((l) => l.id);
    if (parentLevelIds.length > 0) {
      const { data: parentProg } = await supabase
        .from("learn_progress")
        .select("level_id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .in("level_id", parentLevelIds);
      parentDone = (parentProg ?? []).length === parentLevelIds.length;
    }
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
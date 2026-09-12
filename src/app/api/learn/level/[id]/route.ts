import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp } from "@/lib/learn/ranks";
import { isPaidUser, sortNodes, nodeRequiresPaid } from "@/lib/learn/gate";
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

  // Determine unlock order within the path (for freemium gating).
  const { data: siblings } = await supabase
    .from("skill_nodes")
    .select("id,parent_id,depth,order_index")
    .eq("path_id", node.path_id);
  const sorted = sortNodes(siblings ?? []);
  const nodeIndex = sorted.findIndex((n) => n.id === node.id);

  const [subRes, profileRes, parentProgressRes] = await Promise.all([
    supabase.from("subscriptions").select("plan,status,access_until").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("xp,streak_count").eq("user_id", user.id).maybeSingle(),
    node.parent_id
      ? supabase.from("learn_progress").select("status").eq("user_id", user.id).eq("node_id", node.parent_id)
      : Promise.resolve(null),
  ]);

  const paid = isPaidUser(subRes.data);
  const parentDone = !node.parent_id || (parentProgressRes?.data?.length ?? 0) > 0;

  // Gate: parent must be done, and paid-gated nodes need a subscription.
  if (!parentDone) {
    return NextResponse.json({ locked: true, reason: "parent", requiresPaid: false }, { status: 403 });
  }
  if (nodeRequiresPaid(nodeIndex) && !paid) {
    return NextResponse.json({ locked: true, reason: "paid", requiresPaid: true }, { status: 402 });
  }

  const content = await getOrGenerateLevel(user.id, level as LearnLevel, node as SkillNode, (path as VaPath) ?? null);

  return NextResponse.json({
    level: { ...level, content },
    node,
    path,
    user: { ...summarizeXp(profileRes.data?.xp ?? 0), streak: profileRes.data?.streak_count ?? 0 },
    paid,
  });
}

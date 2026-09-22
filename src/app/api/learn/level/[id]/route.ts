import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeXp } from "@/lib/learn/ranks";
import { isPaidUser, nodeRequiresPaid, sortNodes } from "@/lib/learn/gate";
import { getOrGenerateLevel } from "@/lib/learn/level-gen";
import { ensureDaily, getEnergy } from "@/lib/learn/energy";
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

  // Linear position in the path → freemium gate (first FREE_LEVELS are free).
  const { data: siblings } = await supabase.from("skill_nodes").select("id,depth,order_index").eq("path_id", node.path_id);
  const sorted = sortNodes(siblings ?? []);
  const pathIndex = sorted.findIndex((s) => s.id === node.id);

  const [subRes, profileRes] = await Promise.all([
    supabase.from("subscriptions").select("plan,status,access_until").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("xp,streak_count").eq("user_id", user.id).maybeSingle(),
  ]);

  const paid = isPaidUser(subRes.data);

  // Progression order is enforced visually by the path (locked nodes are not
  // clickable). Only the paid-depth gate is enforced server-side.
  if (nodeRequiresPaid(pathIndex) && !paid) {
    return NextResponse.json({ locked: true, reason: "paid", requiresPaid: true }, { status: 402 });
  }

  // Daily Energy gate: FREE/BLOOM have a limited number of lessons per day.
  await ensureDaily(supabase, user.id);
  const energy = await getEnergy(supabase, user.id);
  if (energy.lessonsLeft <= 0) {
    return NextResponse.json({ locked: true, reason: "energy", requiresPaid: false, energy }, { status: 429 });
  }

  const content = await getOrGenerateLevel(user.id, level as LearnLevel, node as SkillNode, (path as VaPath) ?? null);

  return NextResponse.json({
    level: { ...level, content },
    node,
    path,
    plan: energy.plan,
    user: { ...summarizeXp(profileRes.data?.xp ?? 0), streak: profileRes.data?.streak_count ?? 0 },
    paid,
  });
}
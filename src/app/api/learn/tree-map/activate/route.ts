import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/learn/profile";
import { getTreeGraph, XP_PER_POINT, CENTER_ID } from "@/lib/learn/tree-graph";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { node_id } = await request.json().catch(() => ({}));
  if (!node_id || typeof node_id !== "string") {
    return NextResponse.json({ error: "node_id required" }, { status: 400 });
  }

  const graph = getTreeGraph();
  const node = graph.byId.get(node_id);
  if (!node) return NextResponse.json({ error: "Unknown node" }, { status: 404 });
  if (node_id === CENTER_ID) return NextResponse.json({ error: "The Master Seal is always open" }, { status: 400 });

  const [profile, rowsRes] = await Promise.all([
    ensureProfile(supabase, user.id),
    supabase.from("user_tree_nodes").select("node_id").eq("user_id", user.id),
  ]);

  const activated = new Set<string>((rowsRes.data ?? []).map((r) => r.node_id));
  if (activated.has(node_id)) {
    return NextResponse.json({ error: "Already activated" }, { status: 409 });
  }

  // Must be adjacent to your frontier (the Master Seal counts as activated).
  const effective = new Set(activated);
  effective.add(CENTER_ID);
  const adjacent = node.connections.some((c) => effective.has(c));
  if (!adjacent) {
    return NextResponse.json({ error: "You can only grow from your connected path", code: "NOT_ADJACENT" }, { status: 403 });
  }

  // Spend a skill point (earned from XP).
  const xp = profile?.xp ?? 0;
  const earnedPoints = Math.floor(xp / XP_PER_POINT);
  const points = Math.max(0, earnedPoints - activated.size);
  if (points <= 0) {
    return NextResponse.json({ error: "No skill points left — earn XP by finishing lessons", code: "NO_POINTS" }, { status: 402 });
  }

  const { error } = await supabase
    .from("user_tree_nodes")
    .insert({ user_id: user.id, node_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  activated.add(node_id);
  return NextResponse.json({
    success: true,
    activated: Array.from(activated),
    activatedCount: activated.size,
    points: points - 1,
    earnedPoints,
    xp,
  });
}
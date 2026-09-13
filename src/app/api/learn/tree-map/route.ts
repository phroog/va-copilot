import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/learn/profile";
import { XP_PER_POINT } from "@/lib/learn/tree-graph";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await ensureProfile(supabase, user.id);
  const xp = profile?.xp ?? 0;

  const { data: rows } = await supabase.from("user_tree_nodes").select("node_id").eq("user_id", user.id);
  const activated = (rows ?? []).map((r) => r.node_id);

  const earnedPoints = Math.floor(xp / XP_PER_POINT);
  const points = Math.max(0, earnedPoints - activated.length);

  return NextResponse.json({
    activated,
    activatedCount: activated.length,
    points,
    earnedPoints,
    xp,
  });
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lightweight HUD data for the app shell header — avoids pulling the whole
// skill tree on every page load (expensive + slow on weak connections).
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp,streak_count,active_path_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let courseEmoji = "🍠";
  if (profile?.active_path_id) {
    const { data: p } = await supabase.from("va_paths").select("emoji").eq("id", profile.active_path_id).maybeSingle();
    if (p?.emoji) courseEmoji = p.emoji;
  } else {
    const { data: first } = await supabase
      .from("va_paths")
      .select("emoji")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (first?.emoji) courseEmoji = first.emoji;
  }

  return NextResponse.json({
    xp: profile?.xp ?? 0,
    streak: profile?.streak_count ?? 0,
    courseEmoji,
  });
}
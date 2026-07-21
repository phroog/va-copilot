import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: masterclasses, error } = await supabase
    .from("academy_masterclasses")
    .select("*")
    .order("level", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch user progress if authenticated
  let progress: Record<string, { completed: boolean; quiz_score: number | null }> = {};
  if (user) {
    const { data: progData } = await supabase
      .from("academy_progress")
      .select("masterclass_id, completed, quiz_score")
      .eq("user_id", user.id);
    if (progData) {
      progData.forEach((p) => { progress[p.masterclass_id] = { completed: p.completed, quiz_score: p.quiz_score }; });
    }
  }

  // Group by level
  const levels = ["beginner", "intermediate", "advanced", "expert", "business"];
  const grouped = levels.map((level) => ({
    level,
    masterclasses: (masterclasses ?? [])
      .filter((m) => m.level === level)
      .map((m) => ({
        ...m,
        completed: progress[m.id]?.completed ?? false,
        quiz_score: progress[m.id]?.quiz_score ?? null,
      })),
  }));

  return NextResponse.json({ levels: grouped });
}

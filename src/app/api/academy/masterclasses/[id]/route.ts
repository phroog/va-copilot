import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: mc, error } = await supabase
    .from("academy_masterclasses")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !mc) {
    return NextResponse.json({ error: "Masterclass not found" }, { status: 404 });
  }

  // Fetch quiz
  const { data: quiz } = await supabase
    .from("academy_quizzes")
    .select("id, question_data")
    .eq("masterclass_id", params.id)
    .single();

  let userProgress = null;
  if (user) {
    const { data: prog } = await supabase
      .from("academy_progress")
      .select("completed, quiz_score")
      .eq("user_id", user.id)
      .eq("masterclass_id", params.id)
      .single();
    userProgress = prog;
  }

  return NextResponse.json({
    masterclass: mc,
    quiz: quiz ? quiz.question_data : null,
    progress: userProgress,
  });
}

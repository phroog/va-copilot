import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/interview/answer  { sessionId, index, answer }
 * Stores the answer for a question. Kept short & precise on purpose.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { sessionId?: string; index?: number; answer?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.sessionId || typeof body.index !== "number" || typeof body.answer !== "string") {
    return NextResponse.json({ error: "sessionId, index and answer are required" }, { status: 400 });
  }
  const answer = body.answer.trim().slice(0, 200);

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, answers")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const answers: string[] = Array.isArray(session.answers) ? session.answers : [];
  answers[body.index] = answer;

  const { error } = await supabase
    .from("interview_sessions")
    .update({ answers })
    .eq("id", body.sessionId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
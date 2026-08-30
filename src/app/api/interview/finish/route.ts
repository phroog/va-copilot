import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeek } from "@/lib/ai-client";

export const runtime = "nodejs";

/**
 * POST /api/interview/finish  { sessionId }
 * DeepSeek analyses the Q&A and returns a score + feedback. The analysis is a
 * free call (credit already spent at start). Rewards short, precise answers.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { sessionId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  const questions: string[] = Array.isArray(session.questions) ? session.questions : [];
  const answers: string[] = Array.isArray(session.answers) ? session.answers : [];

  const qa = questions
    .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || "(no answer)"}`)
    .join("\n\n");

  const systemPrompt =
    "You are a senior hiring manager giving interview feedback. " +
    "The candidate was explicitly told to answer SHORT and PRECISE (roughly one to two punchy sentences) — that is the interview style, not a mistake. " +
    "Score the interview 0-100 based on: clarity, precision, specificity, and whether the answer directly addresses the question. " +
    "Reward short, confident, concrete answers. Penalize rambling, vague or off-topic answers. " +
    "Return STRICT JSON with exactly these keys: " +
    "'score' (number), 'summary' (string, max 80 words), " +
    "'feedback' (array of {question, answer, verdict, tip} — one per question, verdict short like 'Strong'/'Good'/'Weak', tip a short improvement), " +
    "'tips' (array of up to 3 strings). No text outside the JSON.";

  const prompt = `Interview context:\n${session.scenario || "(saved job)"}\n\n${qa}`;

  let result: any = { score: 50, summary: "Interview analysed.", feedback: [], tips: [] };
  try {
    const ai = await callDeepSeek(user.id, prompt, { systemPrompt, temperature: 0.4, maxTokens: 1400, free: true });
    const parsed = JSON.parse(ai.text);
    if (typeof parsed.score === "number") result.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    if (typeof parsed.summary === "string") result.summary = parsed.summary;
    if (Array.isArray(parsed.feedback)) result.feedback = parsed.feedback.slice(0, questions.length);
    if (Array.isArray(parsed.tips)) result.tips = parsed.tips.slice(0, 3);
  } catch {
    // keep fallback result
  }

  await supabase
    .from("interview_sessions")
    .update({ result, status: "done" })
    .eq("id", session.id)
    .eq("user_id", user.id);

  return NextResponse.json({ result });
}
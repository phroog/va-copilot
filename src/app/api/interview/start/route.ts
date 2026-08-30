import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, spendCredit, callDeepSeek } from "@/lib/ai-client";

export const runtime = "nodejs";

/**
 * POST /api/interview/start  { scenario? | job_id? }
 * Generates 5 tailored interview questions. Costs 1 credit (the whole
 * interview = 1 credit; question gen + analysis are free calls after that).
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { scenario?: string; job_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const scenario = (body.scenario || "").trim();
  const jobId = body.job_id || null;
  if (!scenario && !jobId) {
    return NextResponse.json({ error: "Provide a scenario or pick a saved job" }, { status: 400 });
  }

  const creditCheck = await checkCredits(user.id);
  if (!creditCheck.ok) {
    return NextResponse.json({ error: "Insufficient AI credits" }, { status: 402 });
  }

  // Build the interview context.
  let context = scenario;
  if (jobId) {
    const { data: job } = await supabase.from("jobs").select("title, description, platform, budget").eq("id", jobId).eq("user_id", user.id).maybeSingle();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    context = `Job: ${job.title || ""}\nPlatform: ${job.platform || ""}\nBudget: ${job.budget || ""}\n\nDescription:\n${job.description || ""}`;
  }

  // Spend the interview's credit up-front.
  const spent = await spendCredit(user.id, 1);
  if (!spent) return NextResponse.json({ error: "Insufficient AI credits" }, { status: 402 });

  const systemPrompt =
    "You are a hiring manager running an interview for a virtual assistant / freelancer role. " +
    "Based ONLY on the provided job/scenario, write exactly 5 realistic interview questions a client would ask. " +
    "Make them concrete and relevant to the role. " +
    "Return a JSON array of 5 strings, e.g. [\"Tell me about your experience with...\", ...]. No extra text.";

  let questions: string[] = [];
  try {
    const result = await callDeepSeek(user.id, context, { systemPrompt, temperature: 0.6, maxTokens: 700, free: true });
    const parsed = JSON.parse(result.text);
    if (Array.isArray(parsed)) {
      questions = parsed.map((q) => String(q).trim()).filter(Boolean).slice(0, 5);
    }
  } catch {
    // fallback generic questions if the model misbehaves
    questions = [
      "Tell me about your relevant experience and why you'd be a good fit for this role.",
      "How do you manage your time when juggling multiple tasks or clients?",
      "Walk me through how you'd approach a task you've never done before.",
      "How do you handle tight deadlines or a demanding client?",
      "Why should we hire you over other candidates?",
    ];
  }
  if (questions.length === 0) questions = ["Tell me about yourself and your experience."];

  const { data: session, error } = await supabase
    .from("interview_sessions")
    .insert({ user_id: user.id, scenario, job_id: jobId, questions })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sessionId: session.id, questions });
}
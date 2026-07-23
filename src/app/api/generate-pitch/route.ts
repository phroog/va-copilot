import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeek, checkCredits } from "@/lib/ai-client";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { jobId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { jobId } = body;
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const creditCheck = await checkCredits(user.id);
  if (!creditCheck.ok) {
    return NextResponse.json(
      { error: "Insufficient AI credits. You have 0 credits remaining." },
      { status: 402 }
    );
  }

  const prompt = `Generate a professional cover letter / pitch for a freelance job application. 
Job Title: ${job.title}
Job Description: ${(job.description || "").substring(0, 2000)}
Platform: ${job.platform || "Unknown"}

Write a compelling pitch that:
1. Addresses the client directly
2. Shows enthusiasm for the project
3. Highlights relevant skills and experience
4. Explains why you're the best fit
5. Includes a call to action

Keep it under 300 words. Do not use placeholders like [Your Name].`;

  let pitchContent: string;
  try {
    const result = await callDeepSeek(user.id, prompt, {
      systemPrompt: "You are a professional freelance proposal writer. Write concise, persuasive cover letters.",
      temperature: 0.7,
      maxTokens: 1024,
    });
    pitchContent = result.text;
  } catch (err: any) {
    if (err.status === 402) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    return NextResponse.json(
      { error: "AI generation failed. Please try again later." },
      { status: 503 }
    );
  }

  const { data: pitch, error: pitchError } = await supabase
    .from("pitches")
    .insert({
      job_id: jobId,
      user_id: user.id,
      content: pitchContent,
    })
    .select()
    .single();

  if (pitchError) {
    return NextResponse.json({ error: pitchError.message }, { status: 500 });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  await supabase.from("follow_ups").insert({
    job_id: jobId,
    user_id: user.id,
    due_date: dueDate.toISOString().split("T")[0],
    status: "pending",
  });

  return NextResponse.json({ pitch: pitch.content });
}

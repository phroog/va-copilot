import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeek, checkCredits } from "@/lib/ai-client";

export async function POST(request: Request) {
  const supabase = createClient();

  try {
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

    // Return cached pitch if already exists — no credit cost
    const { data: existingPitch } = await supabase
      .from("pitches")
      .select("content")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .single();

    if (existingPitch) {
      return NextResponse.json({ pitch: existingPitch.content });
    }

    const creditCheck = await checkCredits(user.id);
    if (!creditCheck.ok) {
      return NextResponse.json(
        { error: "Insufficient AI credits. You have 0 credits remaining." },
        { status: 402 }
      );
    }

    const skillsStr = Array.isArray(job.skills) ? job.skills.join(", ") : "";
    const budgetInfo = job.budget_type
      ? `${job.budget_type}${job.budget_amount ? " - " + job.budget_amount : ""}`
      : job.budget || "";

    const prompt = `Generate a professional cover letter / pitch for a freelance job application.

Job Title: ${job.title}
Platform: ${job.platform || "Unknown"}
Budget: ${budgetInfo}
Client: ${[job.client_name, job.client_country].filter(Boolean).join(" from ") || "Not specified"}
Client Rating: ${job.client_rating || "Not specified"}
Skills Required: ${skillsStr || "Not specified"}
Description: ${(job.description || "").substring(0, 3000)}

Write a compelling pitch that:
1. Addresses the client directly and personally
2. Shows enthusiasm for their specific project
3. Highlights relevant skills matching the requirements
4. Explains why you're the best fit
5. Includes a clear call to action

Keep it under 300 words. Do not use placeholders like [Your Name]. Write naturally as if speaking to the client.`;

    let pitchContent: string;
    try {
      const result = await callDeepSeek(user.id, prompt, {
        systemPrompt: "You are a professional freelance proposal writer. Write concise, persuasive cover letters tailored to each job.",
        temperature: 0.7,
        maxTokens: 1024,
      });
      pitchContent = result.text;
    } catch (err: any) {
      console.error("generate-pitch AI error:", err.message);
      if (err.status === 402) {
        return NextResponse.json({ error: err.message }, { status: 402 });
      }
      return NextResponse.json(
        { error: err.message || "AI generation failed. Please try again later." },
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
      console.error("pitch insert error:", pitchError);
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
  } catch (err: any) {
    console.error("generate-pitch unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

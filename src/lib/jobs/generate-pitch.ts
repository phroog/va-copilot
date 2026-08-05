import { callDeepSeek, checkCredits } from "@/lib/ai-client";

/**
 * Generate (or return cached) pitch for a job. Mirrors the logic of the
 * `/api/generate-pitch` route so both paths stay consistent.
 * Throws an Error with a `status` property on failures.
 */
export async function generatePitchForJob(supabase: any, job: any, userId: string, force = false) {
  if (!force) {
    const { data: existingPitch } = await supabase
      .from("pitches")
      .select("content")
      .eq("job_id", job.id)
      .eq("user_id", userId)
      .single();

    if (existingPitch) {
      return existingPitch.content;
    }
  }

  const creditCheck = await checkCredits(userId);
  if (!creditCheck.ok) {
    throw Object.assign(
      new Error("Insufficient AI credits. You have 0 credits remaining."),
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
    const result = await callDeepSeek(userId, prompt, {
      systemPrompt: "You are a professional freelance proposal writer. Write concise, persuasive cover letters tailored to each job.",
      temperature: 0.7,
      maxTokens: 1024,
    });
    pitchContent = result.text;
  } catch (err: any) {
    console.error("generate-pitch AI error:", err.message);
    if (err.status === 402) {
      throw Object.assign(new Error(err.message), { status: 402 });
    }
    throw Object.assign(
      new Error(err.message || "AI generation failed. Please try again later."),
      { status: 503 }
    );
  }

  const { data: pitch, error: pitchError } = await supabase
    .from("pitches")
    .insert({
      job_id: job.id,
      user_id: userId,
      content: pitchContent,
    })
    .select()
    .single();

  if (pitchError) {
    console.error("pitch insert error:", pitchError);
    throw Object.assign(new Error(pitchError.message), { status: 500 });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  await supabase.from("follow_ups").insert({
    job_id: job.id,
    user_id: userId,
    due_date: dueDate.toISOString().split("T")[0],
    status: "pending",
  });

  return pitch.content;
}

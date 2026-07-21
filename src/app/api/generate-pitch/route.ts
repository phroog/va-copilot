import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const pitchContent = `Dear Client,\n\nI am excited about the opportunity to work on "${job.title}". With my extensive experience and skills, I am confident that I can deliver exceptional results for this project.\n\nI have reviewed the job description carefully and believe my background aligns perfectly with your requirements. I am available to start immediately and can commit to the timeline you have outlined.\n\nI look forward to the possibility of discussing this opportunity further.\n\nBest regards,\n[Your Name]`;

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

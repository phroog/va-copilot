import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeek, checkCredits } from "@/lib/ai-client";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, title, description } = await request.json();
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const creditCheck = await checkCredits(user.id);
  if (!creditCheck.ok) {
    return NextResponse.json({ error: "Insufficient AI credits." }, { status: 402 });
  }

  const prompt = `Break this freelance job into a logical series of 3-6 milestones a freelancer would need to complete.

Job Title: ${title || "Untitled"}
Description: ${(description || "").substring(0, 3000)}

For each milestone, provide:
- title (short, actionable)
- description (1 sentence)

Return as a JSON array ONLY, no markdown:
[
  { "title": "...", "description": "..." }
]`;

  let result;
  try {
    result = await callDeepSeek(user.id, prompt, {
      systemPrompt: "You are a project planner. Break jobs into milestones. Return ONLY valid JSON.",
      temperature: 0.3,
      maxTokens: 1024,
    });
  } catch (err: any) {
    if (err.status === 402) return NextResponse.json({ error: err.message }, { status: 402 });
    return NextResponse.json({ error: "AI generation failed" }, { status: 503 });
  }

  let milestones: { title: string; description: string }[] = [];
  try {
    const cleaned = result.text.replace(/```json|```/g, "").trim();
    milestones = JSON.parse(cleaned);
    if (!Array.isArray(milestones)) throw new Error("Not an array");
  } catch {
    return NextResponse.json({ error: "AI returned invalid format" }, { status: 500 });
  }

  const { data: maxOrder } = await supabase
    .from("job_milestones")
    .select("order_index")
    .eq("user_id", user.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  let order_index = (maxOrder?.order_index ?? -1) + 1;
  const inserted: any[] = [];

  for (const m of milestones) {
    const { data } = await supabase
      .from("job_milestones")
      .insert({ user_id: user.id, job_id: jobId, title: m.title, description: m.description || "", order_index })
      .select()
      .single();
    if (data) inserted.push(data);
    order_index++;
  }

  return NextResponse.json({ milestones: inserted });
}

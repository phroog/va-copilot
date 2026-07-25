import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = params.id;

  const { data, error } = await supabase
    .from("job_milestones")
    .select("*")
    .eq("job_id", jobId)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ milestones: data ?? [] });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = params.id;

  // Verify job exists and user owns it
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const body = await request.json();
  const { title, description, due_date, order_index } = body;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  // Get next order_index if not specified
  let idx = order_index ?? 0;
  if (idx === 0) {
    const { data: last } = await supabase
      .from("job_milestones")
      .select("order_index")
      .eq("job_id", jobId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    idx = (last?.order_index ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("job_milestones")
    .insert({
      job_id: jobId,
      user_id: user.id,
      title,
      description: description ?? "",
      due_date: due_date ?? null,
      order_index: idx,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ milestone: data });
}

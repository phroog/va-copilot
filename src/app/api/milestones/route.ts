import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: milestones, error } = await supabase
    .from("job_milestones")
    .select("*, jobs(title, platform)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ milestones });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, due_date, job_id } = body;
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!job_id) return NextResponse.json({ error: "job_id is required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", job_id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: maxOrder } = await supabase
    .from("job_milestones")
    .select("order_index")
    .eq("user_id", user.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const order_index = (maxOrder?.order_index ?? -1) + 1;

  const { data: milestone, error } = await supabase
    .from("job_milestones")
    .insert({ user_id: user.id, job_id, title, description: description || "", due_date: due_date || null, order_index })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ milestone }, { status: 201 });
}

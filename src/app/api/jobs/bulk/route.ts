import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { jobs } = body;

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return NextResponse.json({ error: "Jobs array is required" }, { status: 400 });
  }

  const inserts = jobs.map((job: Record<string, any>) => ({
    user_id: user.id,
    title: job.title || "Untitled",
    description: job.description ?? "",
    platform: job.platform ?? "Unknown",
    url: job.url ?? "",
    budget_type: job.budget_type ?? null,
    budget_amount: job.budget_amount ?? null,
    client_name: job.client_name ?? null,
    skills: job.skills ?? null,
    score: job.score ?? null,
    match_reason: job.match_reason ?? null,
    posted_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from("jobs").insert(inserts).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data, count: data?.length ?? 0 });
}

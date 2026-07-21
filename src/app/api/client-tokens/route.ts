import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { job_id } = await request.json();
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  // Verify the job belongs to this user
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", job_id)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const token = randomBytes(24).toString("hex");

  const { data, error } = await supabase
    .from("client_access_tokens")
    .insert({ job_id, token, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: data });
}

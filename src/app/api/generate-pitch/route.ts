import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePitchForJob } from "@/lib/jobs/generate-pitch";

export async function POST(request: Request) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { jobId?: string; force?: boolean };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { jobId, force } = body;
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

    const pitch = await generatePitchForJob(supabase, job, user.id, force);

    return NextResponse.json({ pitch });
  } catch (err: any) {
    console.error("generate-pitch unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: err.status || 500 }
    );
  }
}

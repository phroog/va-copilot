import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertUserInteraction } from "@/lib/jobs/global";

/**
 * POST /api/jobs/feed/interact
 * Save / un-save / mark applied a global job for the current user.
 * Body: { global_job_id, is_saved?, is_applied? }
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { global_job_id, is_saved, is_applied } = body;
  if (!global_job_id) {
    return NextResponse.json({ error: "global_job_id is required" }, { status: 400 });
  }

  // Verify the job exists.
  const { data: job, error: jobError } = await supabase
    .from("global_jobs")
    .select("id")
    .eq("id", global_job_id)
    .maybeSingle();

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const fields: Record<string, any> = {};
  if (typeof is_saved === "boolean") fields.is_saved = is_saved;
  if (typeof is_applied === "boolean") fields.is_applied = is_applied;

  try {
    const interaction = await upsertUserInteraction(supabase, user.id, global_job_id, fields);
    return NextResponse.json({ interaction });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/jobs/global/[id]/detail
 * Store enriched detail (fetched on-demand from the user's extension) so it is
 * cached for everyone. User-authenticated (the client already has the detail).
 * Body: { detail: { description: string, ... } }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const detail = body?.detail;
  if (!detail || typeof detail !== "object") {
    return NextResponse.json({ error: "detail is required" }, { status: 400 });
  }

  const { data: job } = await supabase.from("global_jobs").select("id").eq("id", id).maybeSingle();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { error } = await supabase.from("global_jobs").update({ detail }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
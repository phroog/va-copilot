import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, spendCredit } from "@/lib/ai-client";

/**
 * POST /api/jobs/global/[id]/reveal
 * Releases the original job URL for 1 credit. The feed/detail APIs never expose
 * the URL, so this is the only way to reach the real posting.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: job } = await supabase.from("global_jobs").select("id, url, title, description, detail").eq("id", id).maybeSingle();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const credit = await checkCredits(user.id);
  if (!credit.ok) {
    return NextResponse.json({ error: "Insufficient AI credits. You have 0 credits remaining." }, { status: 402 });
  }

  const spent = await spendCredit(user.id, 1);
  if (!spent) {
    return NextResponse.json({ error: "Insufficient AI credits. You have 0 credits remaining." }, { status: 402 });
  }

  const description = (job.detail && (job.detail as any).description) || job.description || "";
  return NextResponse.json({ url: job.url, title: job.title, description });
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const supabase = createClient();
  const { token } = await params;

  const { data: tokenData } = await supabase
    .from("review_tokens")
    .select("*, jobs:job_id(id, title, platform)")
    .eq("token", token)
    .maybeSingle();

  if (!tokenData) {
    return NextResponse.json({ error: "Invalid review link" }, { status: 404 });
  }

  if (tokenData.used) {
    return NextResponse.json({ error: "This review link has already been used" }, { status: 410 });
  }

  return NextResponse.json({
    job: tokenData.jobs,
    tokenId: tokenData.id,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const supabase = createClient();
  const { token } = await params;

  const { data: tokenData } = await supabase
    .from("review_tokens")
    .select("*, jobs:job_id(id, title, platform, user_id)")
    .eq("token", token)
    .maybeSingle();

  if (!tokenData) {
    return NextResponse.json({ error: "Invalid review link" }, { status: 404 });
  }

  if (tokenData.used) {
    return NextResponse.json({ error: "This review link has already been used" }, { status: 410 });
  }

  let body: { reviewer_name?: string; reviewer_email?: string; rating?: number; comment?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { reviewer_name, reviewer_email, rating, comment } = body;

  if (!reviewer_name || !reviewer_name.trim()) {
    return NextResponse.json({ error: "Reviewer name is required" }, { status: 400 });
  }
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  // Insert review
  const { data: review, error: reviewError } = await supabase
    .from("client_reviews")
    .insert({
      job_id: tokenData.job_id,
      reviewer_name: reviewer_name.trim(),
      reviewer_email: reviewer_email?.trim() ?? "",
      rating,
      comment: comment?.trim() ?? "",
    })
    .select()
    .single();

  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 });

  // Mark token as used
  await supabase
    .from("review_tokens")
    .update({ used: true })
    .eq("id", tokenData.id);

  return NextResponse.json({ review });
}

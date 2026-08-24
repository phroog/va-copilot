import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callDeepSeek, checkCredits } from "@/lib/ai-client";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { client_name?: string; website_url?: string; job_description?: string; payment_info?: string; job_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.client_name && !body.website_url && !body.job_description && !body.payment_info) {
    return NextResponse.json({ error: "At least one field required: client_name, website_url, job_description, or payment_info" }, { status: 400 });
  }

  const creditCheck = await checkCredits(user.id);
  if (!creditCheck.ok) {
    return NextResponse.json(
      { error: "Insufficient AI credits. You have 0 credits remaining." },
      { status: 402 }
    );
  }

  const parts: string[] = [];
  if (body.client_name) parts.push(`Client Name: ${body.client_name}`);
  if (body.website_url) parts.push(`Website URL: ${body.website_url}`);
  if (body.job_description) parts.push(`Job Description: ${body.job_description}`);
  if (body.payment_info) parts.push(`Payment Info: ${body.payment_info}`);

  const prompt = parts.join("\n");

  const systemPrompt =
    "You are a fraud detection expert for freelancers assessing a job posting. IMPORTANT CONTEXT: the 'website URL' is usually a JOB BOARD link (Indeed, Upwork, Freelancer, etc.) — that is the NORMAL case and must NOT be treated as suspicious. Missing company website, missing payment info, or missing contact details are also NORMAL for job boards and must NOT lower the score by themselves. Only judge the ACTUAL scam signals present in the text.\n\n" +
    "Score the RISK of the posting on a scale of 1 to 100 (higher = more risky/scammy):\n" +
    "- 1-30 (safe): No red flags. Normal job-board posting for a common role.\n" +
    "- 31-55 (caution): A few minor warning signs but nothing definitive.\n" +
    "- 56-79 (suspicious): Clear scam patterns present (fees, data requests, off-platform contact).\n" +
    "- 80-100 (high risk): Strong scam indicators (upfront payment/fee, wire/gift-card payment, request for ID/bank details, telegram/whatsapp-only contact, 'too good to be true', unpaid trial work).\n\n" +
    "Treat a job board URL, missing company footprint, and sparse data as NEUTRAL — do not penalize them. Only raise the score for concrete scam patterns. If there are no red flags, give a low score (below 30).\n" +
    "Output a JSON object with exactly two keys: 'score' (number) and 'analysis' (string, max 150 words, in the same language as the input where possible).";

  let score = 50;
  let analysis = "Unable to analyze at this time. Please try again.";

  try {
    const result = await callDeepSeek(user.id, prompt, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1024,
    });

    try {
      const parsed = JSON.parse(result.text);
      if (typeof parsed.score === "number" && parsed.score >= 1 && parsed.score <= 100) {
        score = parsed.score;
      }
      if (typeof parsed.analysis === "string") {
        analysis = parsed.analysis;
      }
    } catch {
      analysis = result.text.substring(0, 500);
    }
  } catch (err: any) {
    if (err.status === 402) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
  }

  // Save result to DB
  await supabase.from("scam_check_results").insert({
    user_id: user.id,
    job_id: body.job_id || null,
    client_name: body.client_name || "",
    website_url: body.website_url || "",
    score,
    analysis,
  });

  return NextResponse.json({ score, analysis });
}

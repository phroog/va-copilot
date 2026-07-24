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
    "You are a fraud detection expert for freelancers. Based on the provided client information, assess the trustworthiness of this client on a scale of 1 to 100. Consider: professionalism of website, online presence, red flags in payment terms or communication, and typical scam patterns. Output a JSON object with exactly two keys: 'score' (number) and 'analysis' (string, max 150 words).";

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

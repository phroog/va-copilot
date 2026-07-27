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
    "You are a fraud detection expert for freelancers. Based ONLY on the provided client information, assess the trustworthiness of this client on a scale of 1 to 100. Be critical — default to lower scores when data is missing or suspicious.\n\nScoring guidelines:\n- 90-100: Verifiable real business with strong online footprint and clear professional communication\n- 70-89: Likely legitimate but limited verifiable info\n- 40-69: Mixed signals, some red flags or very sparse data\n- 1-39: Clear scam patterns or virtually no verifiable information provided\n\nIf the client_name is empty or generic, website_url is a job board URL (not a company site), and no payment_info is given, score below 40.\nOutput a JSON object with exactly two keys: 'score' (number) and 'analysis' (string, max 150 words).";

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

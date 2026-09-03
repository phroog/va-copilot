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
    "You assess a freelance job posting for scam risk. Be VERY lenient. The default assumption is that the posting is legitimate.\n\n" +
    "HARD RULES — never treat these as suspicious on their own:\n" +
    "- The website URL is a JOB BOARD (Indeed, Upwork, Freelancer, OnlineJobs.ph, Hubstaff Talent, Reddit, etc.). This is the NORMAL case.\n" +
    "- Missing company website, missing payment info, missing contact details, a company name only in the URL, or a lesser-known but legitimate job platform.\n" +
    "- Targeted wording like 'AI-Focused', 'Philippines VAs only', 'remote', 'urgent', or a common job title. These are normal and NOT red flags.\n\n" +
    "The SCORE you output must match the analysis text. The score means RISK (higher = riskier). Choose from these bands ONLY:\n" +
    "- 5-15 (safe): No concrete scam pattern. A normal job-board posting. This is the DEFAULT and most common outcome.\n" +
    "- 25-45 (caution): 1-2 clear but minor signals that need a quick check (e.g. an unusual but not obviously malicious detail).\n" +
    "- 55-75 (suspicious): CONCRETE scam patterns (e.g. asks for an upfront fee, wants payment by wire/gift-card, requests ID or bank details, or insists on contact only via Telegram/WhatsApp).\n" +
    "- 85-100 (high risk): Several strong scam indicators combined.\n\n" +
    "Only raise the score above 15 when there is a CONCRETE, explicit scam pattern in the text — never for vague impressions, unfamiliar domains, missing info, or targeting wording. When in doubt, score low.\n" +
    "Output JSON with exactly two keys: 'score' (number) and 'analysis' (string, max 120 words). The analysis must be consistent with the score: if you give a low score, the analysis must say the posting looks fine/normal; only describe red flags if you actually found concrete ones.";

  let score = 50;
  let analysis = "Unable to analyze at this time. Please try again.";

  // ── Deterministic baseline from the concrete signals the page found ──
  // This keeps the final score honest and consistent with the flagged patterns.
  // Job-board URLs and missing company info are NOT scored here (they are
  // neutral by design); only real red flags push the score up.
  const signalText = [
    body.job_description || "",
    body.payment_info || "",
    body.client_name || "",
  ].join(" ").toLowerCase();

  const has = (re: RegExp) => re.test(signalText);
  let detScore = 8; // neutral baseline (safe)
  const concrete = [];
  if (has(/(fee|pay to (register|apply)|upfront|in advance|deposit.*(secure|reserve)|activation (fee|cost)|registration fee|processing fee)/i)) { detScore += 28; concrete.push("Upfront fee requested"); }
  if (has(/(western union|moneygram|wire transfer|gift card|bitcoin|crypto|paypal\s*(friends|family)|zelle|remitly)/i)) { detScore += 28; concrete.push("Payment via wire/gift card"); }
  if (has(/(credit card (number|details)|bank account (number|details)|ssn|social security|passport (copy|number)|id copy|driver'?s license copy|copy of (id|passport))/i)) { detScore += 25; concrete.push("Sensitive data requested"); }
  if (has(/contact.*(only.*)?(telegram|whatsapp)|message.*(telegram|whatsapp)/i)) { detScore += 22; concrete.push("Contact only via Telegram/WhatsApp"); }
  if (has(/(work|do|test|sample).*(free|without pay)|unpaid (trial|test|task)/i)) { detScore += 25; concrete.push("Unpaid test work"); }
  if (has(/unlimited earning|guaranteed (income|salary|profit|earnings)|get rich|residual income|passive income|make \$\d{2,3}[k,]?\/?day/i)) { detScore += 22; concrete.push("Too good to be true"); }
  if (has(/recruiters? needed|referral (bonus|commission)|network marketing|multi[- ]level/i)) { detScore += 18; concrete.push("MLM/Recruiting"); }
  detScore = Math.max(5, Math.min(100, detScore));

  try {
    const result = await callDeepSeek(user.id, prompt, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1024,
    });

    let aiScore: number | null = null;
    let aiAnalysis = analysis;
    try {
      const parsed = JSON.parse(result.text);
      if (typeof parsed.score === "number" && parsed.score >= 1 && parsed.score <= 100) {
        aiScore = parsed.score;
      }
      if (typeof parsed.analysis === "string") {
        aiAnalysis = parsed.analysis;
      }
    } catch {
      aiAnalysis = result.text.substring(0, 500);
    }

    // Reconcile: the final score must reflect the deterministic red flags so
    // it can never contradict the flagged evidence. When the AI reports red
    // flags we detected, use the higher of the two; when the AI is over-eager
    // (high score but no concrete pattern), cap it to the deterministic value.
    if (aiScore == null) {
      score = detScore;
    } else if (concrete.length === 0) {
      // No concrete red flag detected → the posting is effectively safe. Cap
      // the AI's score to the "caution" ceiling so a normal job never scores
      // as a scam.
      score = Math.min(aiScore, 45);
    } else {
      score = Math.max(aiScore, detScore);
    }
    analysis = aiAnalysis;

    // Keep the analysis text consistent: if we ended up "safe", make sure the
    // text doesn't describe scary red flags we never found.
    if (concrete.length === 0 && score <= 20 && /red flag|suspicious|scam|phishing|risky/i.test(analysis) && !/no (red flags|clear)|looks (safe|fine|legit)|normal/i.test(analysis)) {
      analysis = "This looks like a normal job posting. No concrete scam patterns (no upfront fees, no suspicious payment methods, no request for sensitive data, no off-platform-only contact) were found.";
    }
  } catch (err: any) {
    if (err.status === 402) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    score = detScore;
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

  // Real-time scam alert: push when the score is clearly elevated (55+).
  if (score >= 55) {
    const { notifyTelegramEvent } = await import("@/lib/telegram");
    const target = body.client_name || body.website_url || "a client";
    const level = score >= 85 ? "High risk 🚨" : "Suspicious ⚠️";
    await notifyTelegramEvent(
      user.id,
      "scam",
      `🛡️ <b>Scam alert — ${level}</b>\n\n` +
        `You checked <b>${target}</b> and it scored <b>${score}/100</b>.\n` +
        `${analysis.slice(0, 200)}\n\n` +
        `💡 Don't send money, documents or payment details. When in doubt, walk away.`
    );
  }

  return NextResponse.json({ score, analysis });
}

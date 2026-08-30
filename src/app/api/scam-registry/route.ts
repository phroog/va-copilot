import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { effectivePlan, SCAM_REGISTRY_FULL_PLANS } from "@/lib/payments";

export const runtime = "nodejs";

const TEASER_LIMIT = 3;

/* Deterministic risk suggestion for a new report (AI/rule based — pending until
   an admin approves). */
function suggestRisk(domain: string, description: string): "low" | "medium" | "high" {
  const d = (domain || "").toLowerCase();
  const t = (description || "").toLowerCase();
  let risk = 0;
  if (/\.(zip|mov|country|click|gq|top|xyz|tk|ml|cf|ga|date|icu|work|racing)$/i.test(d)) risk += 2;
  if (/paypal|verify|login|secure|update|billing/i.test(d) && !/paypal\.com$/.test(d)) risk += 2;
  if (/(fee|upfront|western union|gift card|wire transfer|bank details|ssn|social security|passport|telegram|whatsapp)/i.test(t)) risk += 2;
  if (/(urgent|too good|guaranteed|no experience)/i.test(t)) risk += 1;
  return risk >= 4 ? "high" : risk >= 2 ? "medium" : "low";
}

/**
 * GET /api/scam-registry?q=
 * Bloom + Money Club: full approved list. Sprout (free): teaser with count.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sub } = await supabase.from("subscriptions").select("plan, status, access_until").eq("user_id", user.id).maybeSingle();
  const plan = effectivePlan(sub);
  const full = SCAM_REGISTRY_FULL_PLANS.includes(plan);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const query = supabase
    .from("scam_registry")
    .select("*")
    .eq("status", "approved")
    .order("votes_up", { ascending: false });

  if (full) {
    if (q) query.ilike("domain", `%${q}%`);
    const { data, error } = await query.limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries: data ?? [], full: true, count: (data ?? []).length });
  }

  // Sprout teaser: total approved count + a few samples + upgrade nudge.
  const { count } = await supabase
    .from("scam_registry")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");
  const { data } = await query.limit(TEASER_LIMIT);
  return NextResponse.json({ entries: data ?? [], full: false, count: count ?? 0, teaser: true });
}

/**
 * POST /api/scam-registry  { domain, company_name, description }
 * Flag a company/URL. Stored as pending, risk suggested by rules; an admin
 * approves it to become "official".
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { domain?: string; company_name?: string; description?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  let domain = (body.domain || "").trim().toLowerCase();
  if (!domain) return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain.replace(/^https?:\/\//, ""))) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }
  domain = domain.replace(/^https?:\/\//, "");

  const risk = suggestRisk(domain, body.description || "");

  const { data, error } = await supabase
    .from("scam_registry")
    .upsert(
      {
        domain,
        company_name: (body.company_name || "").trim(),
        description: (body.description || "").trim(),
        risk,
        status: "pending",
        flagged_by: user.id,
      },
      { onConflict: "domain" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entry: data, message: "Report submitted for review." });
}
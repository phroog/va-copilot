import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyJobVector, matchVectors, validateUserVector, type Vector } from "@/lib/jobs/profile-vector";
import { computeScore } from "@/lib/jobs/scoring";
import { scamScore } from "@/lib/jobs/scam-score";
import { PLANS, SWAP_LIMITS, MATCH_THRESHOLD, dailyBonus, effectivePlan } from "@/lib/payments";

const WINDOW_CAP = 4000;

function num(v: string | null, d: number): number {
  const n = parseInt(v || "", 10);
  return isNaN(n) ? d : n;
}

/**
 * GET /api/jobs/feed?limit=&offset=&q=&platform=&category=&score=&sort=&hours=
 * Server-side paginated live feed. scoring + profile_match are computed on the
 * fly (deterministic, free) over the requested time window, then filtered,
 * sorted and sliced. Returns { jobs, total, hasMore }.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, num(url.searchParams.get("limit"), 50)));
  const offset = Math.max(0, num(url.searchParams.get("offset"), 0));
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const platform = url.searchParams.get("platform") || "all";
  const category = url.searchParams.get("category") || "all";
  const score = url.searchParams.get("score") || "all";
  const risk = url.searchParams.get("risk") || "all";
  const sort = url.searchParams.get("sort") || "match";
  const hours = Math.max(1, Math.min(168, num(url.searchParams.get("hours"), 24)));
  const countViews = url.searchParams.get("count_views") === "1";
  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

  // Sources toggled off in Live Feed settings are hidden.
  const { data: excludedSources } = await supabase
    .from("job_sources")
    .select("id")
    .eq("include_in_live_feed", false);
  const excludedIds: string[] = (excludedSources ?? []).map((s: any) => s.id);

  const { data: interactions, error: intError } = await supabase
    .from("user_job_interactions")
    .select("*")
    .eq("user_id", user.id);

  if (intError) return NextResponse.json({ error: intError.message }, { status: 500 });

  const interactionMap = new Map<string, any>();
  const savedIds: string[] = [];
  for (const it of (interactions ?? [])) {
    interactionMap.set(it.global_job_id, it);
    if (it.is_saved || it.is_applied) savedIds.push(it.global_job_id);
  }

  let query = supabase.from("global_jobs").select("*");
  if (excludedIds.length > 0) {
    query = query.not("source_id", "in", `(${excludedIds.join(",")})`);
  }
  if (savedIds.length > 0) {
    query = query.or(`collected_at.gt.${cutoff},id.in.(${savedIds.join(",")})`);
  } else {
    query = query.gt("collected_at", cutoff);
  }

  // Generous window so "best match" sorting + filtering are computed over the
  // whole visible set, then paginated server-side.
  const { data: jobs, error: jobsError } = await query
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(WINDOW_CAP);
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("skills, desired_rate, experience_level, job_categories, job_vector")
    .eq("user_id", user.id)
    .maybeSingle();

  let userVec: Vector | null = null;
  const profileHasData =
    !!profile &&
    ((Array.isArray(profile.skills) && profile.skills.length > 0) ||
      profile.desired_rate ||
      (Array.isArray(profile.job_categories) && profile.job_categories.length > 0));
  if (profile?.job_vector) userVec = validateUserVector(profile.job_vector);

  let rows = (jobs ?? []).map((job: any) => {
    const it = interactionMap.get(job.id) ?? {};
    const profileVector: Vector = Array.isArray(job.profile_vector) ? job.profile_vector : classifyJobVector(job).vector;
    const match = userVec ? matchVectors(userVec, profileVector) : null;
    const scored = profileHasData ? computeScore(job, profile) : null;
    const scam = scamScore(job);
    // Jobs within the user's daily tier limit come complete: full description
    // + link. The tier limits are the paywall; no per-job credit unlock.
    const { detail: _detail, ...jobRest } = job;
    return {
      ...jobRest,
      description: (job.detail?.description || job.description || ""),
      profile_vector: profileVector,
      profile_match: match ? match.score : null,
      matching_score: scored?.score ?? null,
      matched_skills: scored?.matched_skills ?? [],
      scam_risk: scam.risk,
      scam_level: scam.level,
      scam_flags: scam.flags,
      is_saved: it.is_saved ?? false,
      is_applied: it.is_applied ?? false,
      pitch_id: it.pitch_id ?? null,
    };
  });

  // Distinct platform/category options for the filter dropdowns — computed over
  // the full window (before filters) so every option is always available.
  const platforms = Array.from(new Set(rows.map((j: any) => j.platform).filter(Boolean))).sort();
  const categories = Array.from(new Set(rows.map((j: any) => j.category).filter(Boolean))).sort();

  if (q) rows = rows.filter((j: any) => ((j.title || "") + " " + (j.description || "")).toLowerCase().includes(q));
  if (platform !== "all") rows = rows.filter((j: any) => j.platform === platform);
  if (category !== "all") rows = rows.filter((j: any) => j.category === category);
  if (score === "high") rows = rows.filter((j: any) => (j.matching_score ?? 0) >= 70);
  else if (score === "medium") rows = rows.filter((j: any) => (j.matching_score ?? 0) >= 40 && (j.matching_score ?? 0) < 70);
  else if (score === "low") rows = rows.filter((j: any) => (j.matching_score ?? 0) < 40);

  if (risk !== "all") rows = rows.filter((j: any) => j.scam_level === risk);

  if (sort === "match") {
    rows = [...rows].sort((a: any, b: any) => (b.profile_match ?? -1) - (a.profile_match ?? -1));
  }

  // ── Swap: never re-offer jobs the user traded away ──────────────────
  const swappedIds = (interactions ?? [])
    .filter((it: any) => it.swapped)
    .map((it: any) => it.global_job_id);
  if (swappedIds.length > 0) {
    rows = rows.filter((j: any) => !swappedIds.includes(j.id));
  }

  const total = rows.length;
  // Matched jobs first (default), so the daily quota is spent on best fits.
  const matchedRows = rows.filter((j: any) => (j.profile_match ?? 0) >= MATCH_THRESHOLD);
  const otherRows = rows.filter((j: any) => (j.profile_match ?? 0) < MATCH_THRESHOLD);
  rows = sort === "newest" ? rows : [...matchedRows, ...otherRows];
  const page = rows.slice(offset, offset + limit);

  // ── Tiered daily quota: matched jobs only ──────────────────────────
  // The daily limit (plan + daily bonus) applies to matched jobs
  // (profile_match >= MATCH_THRESHOLD). Unmatched jobs are free to browse and
  // are exactly the ones you can "swap". Views count only on user-initiated
  // loads (count_views=1); background merge refreshes (count_views=0) re-show
  // already-seen jobs without charging.
  const { data: sub } = await supabase.from("subscriptions").select("plan, status, access_until").eq("user_id", user.id).maybeSingle();
  const plan = effectivePlan(sub);
  const planLimit = PLANS[plan].dailyJobLimit; // null = unlimited (pro)
  const today = new Date().toISOString().slice(0, 10);

  let bonus = 0;
  let usedToday = 0;
  let swapUsed = 0;
  if (planLimit != null) {
    const { data: view } = await supabase
      .from("user_job_views")
      .select("*")
      .eq("user_id", user.id)
      .eq("view_date", today)
      .maybeSingle();
    if (view) {
      usedToday = view.count ?? 0;
      swapUsed = view.swaps ?? 0;
      bonus = view.bonus ?? 0;
    } else {
      bonus = dailyBonus();
      await supabase.from("user_job_views").upsert(
        { user_id: user.id, view_date: today, count: 0, swaps: 0, bonus },
        { onConflict: "user_id,view_date" }
      );
    }
  }
  const dailyLimit = planLimit != null ? planLimit + bonus : null;

  const matchedCount = (arr: any[]) => arr.filter((j: any) => (j.profile_match ?? 0) >= MATCH_THRESHOLD).length;

  let jobsOut = page;
  let newUsed = 0;
  if (dailyLimit != null) {
    const matchedOnPage = matchedCount(page);
    const remaining = Math.max(0, dailyLimit - usedToday);
    if (countViews && matchedOnPage > remaining) {
      let kept = 0;
      jobsOut = page.filter((j: any) => {
        if ((j.profile_match ?? 0) >= MATCH_THRESHOLD) {
          if (kept < remaining) { kept++; return true; }
          return false;
        }
        return true;
      });
      newUsed = matchedCount(jobsOut);
    } else if (countViews) {
      newUsed = matchedOnPage;
    }
    if (countViews && newUsed > 0) {
      const nextCount = usedToday + newUsed;
      await supabase.from("user_job_views").upsert(
        { user_id: user.id, view_date: today, count: nextCount, swaps: swapUsed, bonus },
        { onConflict: "user_id,view_date" }
      );
    }
  }

  const used = dailyLimit != null ? usedToday + newUsed : null;
  const limitReached = dailyLimit != null && countViews && usedToday + newUsed >= dailyLimit;
  const hasMore = offset + limit < total && (dailyLimit == null || usedToday + matchedCount(page) < dailyLimit);

  return NextResponse.json({
    jobs: jobsOut,
    total,
    hasMore,
    offset,
    platforms,
    categories,
    plan,
    used,
    limit: dailyLimit,
    bonus,
    swapsLeft: dailyLimit != null ? SWAP_LIMITS[plan] - swapUsed : null,
    limitReached,
  });
}
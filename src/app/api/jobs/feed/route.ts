import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyJobVector, matchVectors, validateUserVector, NEUTRAL_JOB_VECTOR, type Vector } from "@/lib/jobs/profile-vector";
import { computeScore } from "@/lib/jobs/scoring";
import { scamScore } from "@/lib/jobs/scam-score";
import { PLANS, SWAP_LIMITS, MATCH_THRESHOLD, AUTO_GRANT_THRESHOLD, dailyBonus, effectivePlan } from "@/lib/payments";

const WINDOW_CAP = 4000;

function num(v: string | null, d: number): number {
  const n = parseInt(v || "", 10);
  return isNaN(n) ? d : n;
}

/**
 * GET /api/jobs/feed?mode=best|matches|newest&limit=&offset=&q=&platform=&category=&score=&hours=
 *
 * Three views:
 * - newest  → raw incoming live feed (24h), newest first.
 * - best    → the whole system pool ordered by match score.
 * - matches → the user's auto-collected matched jobs (My Matches), persisted
 *             across days, sorted by match.
 *
 * For Sprout/Bloom the daily quota auto-grants the TOP matched jobs into My
 * Matches (no viewing required). Pro (Money Club) is unlimited and has no
 * My Matches.
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
  const hours = Math.max(1, Math.min(168, num(url.searchParams.get("hours"), 24)));
  const countViews = url.searchParams.get("count_views") === "1";
  const mode = url.searchParams.get("mode") || "best"; // best | matches | newest
  const list = url.searchParams.get("list") || "daily"; // matches sub-view: daily | library
  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().replace(/\.\d{3}Z$/, "Z");

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

  // Profile → match vector (neutral fallback so the feed is always usable).
  const { data: profile } = await supabase
    .from("profiles")
    .select("skills, desired_rate, experience_level, job_categories, job_vector")
    .eq("user_id", user.id)
    .maybeSingle();
  const userVec: Vector | null = profile?.job_vector
    ? validateUserVector(profile.job_vector)
    : NEUTRAL_JOB_VECTOR;
  const profileHasData =
    !!profile &&
    ((Array.isArray(profile.skills) && profile.skills.length > 0) ||
      profile.desired_rate ||
      (Array.isArray(profile.job_categories) && profile.job_categories.length > 0));

  // Plan + daily matched quota.
  const { data: sub } = await supabase.from("subscriptions").select("plan, status, access_until").eq("user_id", user.id).maybeSingle();
  const plan = effectivePlan(sub);
  const isPro = plan === "pro";
  const today = new Date().toISOString().slice(0, 10);

  let bonus = 0;
  let swapUsed = 0;
  // The daily quota = how many TOP matched jobs are auto-granted into My Matches
  // each day. Pro is unlimited.
  const planLimit = isPro ? null : PLANS[plan].dailyJobLimit;
  if (planLimit != null) {
    const { data: view } = await supabase
      .from("user_job_views")
      .select("*")
      .eq("user_id", user.id)
      .eq("view_date", today)
      .maybeSingle();
    if (view) {
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

  // usedToday = number of jobs granted TODAY (source of truth: user_opened_jobs,
  // NOT the legacy view counter — that self-heals users who only have stale
  // view counts from before auto-granting existed).
  let usedToday = 0;
  if (planLimit != null) {
    const { count } = await supabase
      .from("user_opened_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("opened_at", today);
    usedToday = count ?? 0;
  }

  // ── Auto-grant today's top matched jobs into My Matches ────────────
  // Fills the remaining quota with the best matching jobs automatically — the
  // user does NOT have to view them. Runs on user-initiated loads (count_views=1).
  if (countViews && dailyLimit != null) {
    const remaining = Math.max(0, dailyLimit - usedToday);
    if (remaining > 0) {
      const { data: opened } = await supabase
        .from("user_opened_jobs")
        .select("global_job_id")
        .eq("user_id", user.id);
      const openedSet = new Set((opened ?? []).map((o: any) => o.global_job_id));

      let cand = supabase
        .from("global_jobs")
        .select("id, profile_vector, posted_at, collected_at")
        .gt("collected_at", monthAgo)
        .order("collected_at", { ascending: false })
        .limit(1500);
      if (excludedIds.length > 0) cand = cand.not("source_id", "in", `(${excludedIds.join(",")})`);
      const { data: candidates } = await cand;

      const best = (candidates ?? [])
        .filter((j: any) => !openedSet.has(j.id))
        .map((j: any) => {
          const pv: Vector = Array.isArray(j.profile_vector) ? j.profile_vector : classifyJobVector(j).vector;
          const m = userVec ? matchVectors(userVec, pv).score : 0;
          const t = new Date(j.posted_at || j.collected_at || 0).getTime();
          return { id: j.id, m, t };
        })
        .filter((j: any) => j.m >= AUTO_GRANT_THRESHOLD)
        .sort((a: any, b: any) => b.t - a.t) // newest matching jobs first
        .slice(0, remaining);

      if (best.length > 0) {
        await supabase.from("user_opened_jobs").upsert(
          best.map((j: any) => ({ user_id: user.id, global_job_id: j.id, opened_at: new Date().toISOString() })),
          { onConflict: "user_id,global_job_id" }
        );
        usedToday += best.length;
        await supabase.from("user_job_views").upsert(
          { user_id: user.id, view_date: today, count: usedToday, swaps: swapUsed, bonus },
          { onConflict: "user_id,view_date" }
        );
      }
    }
  }

  // My Matches: the auto-granted jobs, persisted across days. Split into
  // "daily" (today's quota) and "library" (every job ever granted).
  let openedOrder: string[] = [];
  let libraryCount = 0;
  if (mode === "matches") {
    const { count: libCount } = await supabase
      .from("user_opened_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    libraryCount = libCount ?? 0;

    let oq = supabase
      .from("user_opened_jobs")
      .select("global_job_id")
      .eq("user_id", user.id);
    if (list === "daily") oq = oq.gte("opened_at", today);
    const { data: opened } = await oq.order("opened_at", { ascending: false }).limit(500);
    openedOrder = (opened ?? []).map((o: any) => o.global_job_id);
  }

  let query = supabase.from("global_jobs").select("*");
  if (excludedIds.length > 0) {
    query = query.not("source_id", "in", `(${excludedIds.join(",")})`);
  }
  if (mode === "matches") {
    if (openedOrder.length > 0) {
      query = query.in("id", openedOrder);
    } else {
      // No granted jobs yet — force empty instead of returning the whole pool.
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  } else {
    const w = mode === "best" ? monthAgo : cutoff;
    if (savedIds.length > 0) {
      query = query.or(`collected_at.gt.${w},id.in.(${savedIds.join(",")})`);
    } else {
      query = query.gt("collected_at", w);
    }
  }

  const { data: jobs, error: jobsError } = await query
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(mode === "best" ? 3000 : WINDOW_CAP);
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });

  let rows = (jobs ?? []).map((job: any) => {
    const it = interactionMap.get(job.id) ?? {};
    const profileVector: Vector = Array.isArray(job.profile_vector) ? job.profile_vector : classifyJobVector(job).vector;
    const match = userVec ? matchVectors(userVec, profileVector) : null;
    const scored = profileHasData ? computeScore(job, profile) : null;
    const scam = scamScore(job);
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

  // Distinct platform/category options for the filter dropdowns.
  const platforms = Array.from(new Set(rows.map((j: any) => j.platform).filter(Boolean))).sort();
  const categories = Array.from(new Set(rows.map((j: any) => j.category).filter(Boolean))).sort();

  // Always list every configured platform in the dropdown.
  const { data: srcPlats } = await supabase.from("job_sources").select("platform").not("platform", "is", null);
  const allPlatforms = Array.from(new Set([...platforms, ...(srcPlats ?? []).map((s: any) => s.platform).filter(Boolean)])).sort();

  if (q) rows = rows.filter((j: any) => ((j.title || "") + " " + (j.description || "")).toLowerCase().includes(q));
  if (platform !== "all") rows = rows.filter((j: any) => String(j.platform || "").toLowerCase() === platform.toLowerCase());
  if (category !== "all") rows = rows.filter((j: any) => j.category === category);
  if (score === "high") rows = rows.filter((j: any) => (j.matching_score ?? 0) >= 70);
  else if (score === "medium") rows = rows.filter((j: any) => (j.matching_score ?? 0) >= 40 && (j.matching_score ?? 0) < 70);
  else if (score === "low") rows = rows.filter((j: any) => (j.matching_score ?? 0) < 40);
  if (risk !== "all") rows = rows.filter((j: any) => j.scam_level === risk);

  // ── Swap: never re-offer jobs the user traded away. Skipped for My Matches,
  // which is the user's own list (a job received via swap must stay visible). ──
  if (mode !== "matches") {
    const swappedIds = (interactions ?? [])
      .filter((it: any) => it.swapped)
      .map((it: any) => it.global_job_id);
    if (swappedIds.length > 0) {
      rows = rows.filter((j: any) => !swappedIds.includes(j.id));
    }
  }

  const total = rows.length;
  // Order per view: matches/best by match score, newest by recency.
  const ts = (j: any) => new Date(j.posted_at || j.collected_at || 0).getTime();
  if (mode === "newest") {
    rows = [...rows].sort((a: any, b: any) => ts(b) - ts(a));
  } else {
    rows = [...rows].sort((a: any, b: any) => (b.profile_match ?? -1) - (a.profile_match ?? -1));
  }
  const page = rows.slice(offset, offset + limit);

  const used = dailyLimit != null ? usedToday : null;
  const limitReached = dailyLimit != null && usedToday >= dailyLimit;
  const hasMore = offset + limit < total;

  // ── Clickability / gating ─────────────────────────────────────────
  // Pro can open everything. Sprout + Bloom: matched jobs are clickable until
  // the daily quota is reached, then they lock. My Matches are always clickable.
  const jobsOut = page.map((j: any) => {
    const canClick = mode === "matches" ? true : isPro || (j.profile_match ?? 0) >= MATCH_THRESHOLD;
    const locked = mode !== "matches" && !isPro && canClick && limitReached;
    return { ...j, clickable: canClick, locked };
  });

  return NextResponse.json({
    jobs: jobsOut,
    total,
    hasMore,
    offset,
    platforms: allPlatforms,
    categories,
    plan,
    used,
    limit: dailyLimit,
    bonus,
    swapsLeft: dailyLimit != null && SWAP_LIMITS[plan] != null ? (SWAP_LIMITS[plan] as number) - swapUsed : null,
    limitReached,
    mode,
    list,
    libraryCount,
  });
}
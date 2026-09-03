import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { categorizeJob } from "@/lib/jobs/scoring";
import { matchVectors, validateUserVector } from "@/lib/jobs/profile-vector";
import { effectivePlan, AUTO_GRANT_THRESHOLD, PLANS } from "@/lib/payments";
import { sendTelegram } from "@/lib/telegram";

/* Realtime reminder sweep: runs piggybacked on the job push (which fires on
   every collector insert, i.e. every few minutes — effectively realtime, no
   cron). For every Telegram-enabled user it pushes due/overdue follow-ups once
   (tracked via telegram_pushed_jobs, prefix "fu:<id>"). */
async function pushDueFollowups() {
  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString().slice(0, 10);
    const { data: due } = await supabase
      .from("follow_ups")
      .select("id, user_id, due_date, jobs(title)")
      .eq("status", "pending")
      .lte("due_date", now);

    const byUser = new Map<string, any[]>();
    for (const f of (due ?? [])) {
      const list = byUser.get(f.user_id) ?? [];
      list.push(f);
      byUser.set(f.user_id, list);
    }

    const userIds = Array.from(byUser.keys());
    for (const userId of userIds) {
      const items = byUser.get(userId) ?? [];
      const { data: settings } = await supabase
        .from("user_settings")
        .select("telegram_enabled, telegram_push_followups, telegram_pushed_jobs")
        .eq("user_id", userId)
        .maybeSingle();
      if (!settings?.telegram_enabled || settings.telegram_push_followups !== true) continue;

      const pushed = Array.isArray(settings.telegram_pushed_jobs) ? settings.telegram_pushed_jobs : [];
      const fresh = items.filter((f: any) => !pushed.includes(`fu:${f.id}`));
      if (fresh.length === 0) continue;

      const { data: link } = await supabase
        .from("telegram_links")
        .select("chat_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!link) continue;

      const lines = ["⏰ <b>Follow-ups due:</b>\n"];
      for (const f of fresh.slice(0, 5)) {
        const jobTitle = f.jobs?.title || "Job";
        lines.push(`• ${jobTitle} (due ${f.due_date})`);
      }
      const ok = await sendTelegram(link.chat_id, lines.join("\n"));
      if (ok) {
        await supabase
          .from("user_settings")
          .update({ telegram_pushed_jobs: [...pushed, ...fresh.map((f: any) => `fu:${f.id}`)].slice(-100) })
          .eq("user_id", userId);
      }
    }
  } catch {
    // Never let a reminder sweep break the job insert.
  }
}

/**
 * Real-time Telegram push for a freshly inserted job (no cron / no DB trigger —
 * fires right here when the collector inserts a new row). For every Money Club
 * (pro) user with Telegram linked + match notifications enabled, it sends the
 * job as soon as the match score clears the confident threshold.
 */
export async function notifyTelegramMatches(job: Record<string, any>) {
  if (!job?.id) return;
  const jobVec: any = Array.isArray(job.profile_vector) ? job.profile_vector : null;
  if (!jobVec) return;
  const title = job.title || "";
  const platform = job.platform || "";
  const budget = job.budget || "";
  const url = job.url || "";

  try {
    const supabase = createServiceRoleClient();
    const { data: links } = await supabase.from("telegram_links").select("user_id, chat_id");
    for (const link of links ?? []) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("telegram_enabled, telegram_push_matches, telegram_pushed_jobs, push_day, push_count")
        .eq("user_id", link.user_id)
        .maybeSingle();
      if (!settings?.telegram_enabled || settings.telegram_push_matches !== true) continue;

      const pushed = Array.isArray(settings.telegram_pushed_jobs) ? settings.telegram_pushed_jobs : [];
      if (pushed.includes(job.id)) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("job_vector")
        .eq("user_id", link.user_id)
        .maybeSingle();
      const userVec = profile?.job_vector ? validateUserVector(profile.job_vector) : null;
      if (!userVec) continue;
      const match = matchVectors(userVec, jobVec).score;
      if (match < AUTO_GRANT_THRESHOLD) continue;

      // Live job push is available on Bloom (basic) + Money Club (pro).
      // Follow-ups/invoices/scam stay a Money Club perk (handled in the bot).
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, access_until")
        .eq("user_id", link.user_id)
        .maybeSingle();
      const plan = effectivePlan(sub);
      if (plan !== "basic" && plan !== "pro") continue;

      // ── Daily quota: Bloom gets at most dailyJobLimit pushes per day. ──
      const today = new Date().toISOString().slice(0, 10);
      const limit = PLANS[plan].dailyJobLimit; // basic=100, pro=null (unlimited)
      let dayCount = settings.push_day === today ? (settings.push_count ?? 0) : 0;
      if (limit != null && dayCount >= limit) continue;

      const text =
        `🎯 <b>New match for you!</b>\n\n` +
        `<b>${title}</b> (${match}%)\n${platform} · ${budget || "n/a"}` +
        (url ? `\n<a href="${url}">Open job ↗</a>` : "");
      const ok = await sendTelegram(link.chat_id, text);
      if (ok) {
        await supabase
          .from("user_settings")
          .update({
            telegram_pushed_jobs: [...pushed, job.id].slice(-50),
            push_day: today,
            push_count: dayCount + 1,
          })
          .eq("user_id", link.user_id);
      }
    }
  } catch {
    // Never break the job insert because of a notification failure.
  }

  // Due/overdue follow-up reminders (piggybacked, so no cron needed).
  await pushDueFollowups();
}

/* Real-time email push was replaced by the daily digest (api/emails/digest),
   which respects the plan quota and sends exactly one evening email. */

/**
 * Insert a job into the shared `global_jobs` feed.
 * Deduplicates on `url` (ON CONFLICT DO NOTHING semantics):
 * if the URL already exists we return the existing row.
 * Returns `{ job, inserted }` — `inserted` is true only for a new row.
 */
export async function upsertGlobalJob(job: Record<string, any>) {
  const supabase = createServiceRoleClient();

  const payload: Record<string, any> = {
    source_id: job.source_id ?? null,
    external_id: job.external_id ?? null,
    title: job.title || "Untitled",
    description: job.description ?? null,
    budget: job.budget ?? job.budget_amount ?? null,
    url: job.url || `sari://manual/${crypto.randomUUID()}`,
    platform: job.platform || job.source_platform || null,
    skills: Array.isArray(job.skills) ? job.skills : null,
    client_name: job.client_name ?? null,
    client_country: job.client_country ?? null,
    client_rating: job.client_rating ?? null,
    experience_level: job.experience_level ?? job.experienceLevel ?? null,
    posted_at: job.posted_at ?? null,
    category: job.category ?? categorizeJob(job),
    profile_vector: job.profile_vector ?? null,
  };

  if (!payload.url || payload.url === "") {
    payload.url = `sari://manual/${crypto.randomUUID()}`;
  }

  const { data, error } = await supabase
    .from("global_jobs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    // Likely a unique violation on url -> return the existing row.
    const { data: existing } = await supabase
      .from("global_jobs")
      .select("*")
      .eq("url", payload.url)
      .maybeSingle();
    return { job: existing ?? null, inserted: false };
  }

  // Real-time Telegram push (Bloom + Money Club, confident matches) — no cron needed.
  if (data) {
    await notifyTelegramMatches(data);
  }

  return { job: data, inserted: true };
}

/**
 * Upsert the current user's interaction with a global job.
 */
export async function upsertUserInteraction(
  supabase: any,
  userId: string,
  globalJobId: string,
  fields: Record<string, any> = {}
) {
  const { data, error } = await supabase
    .from("user_job_interactions")
    .upsert(
      { user_id: userId, global_job_id: globalJobId, ...fields },
      { onConflict: "user_id,global_job_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Sync a freshly created user job into the shared feed and mark it saved.
 * Returns the global job id (or null if sync failed).
 */
export async function syncUserJobToFeed(job: Record<string, any>): Promise<string | null> {
  try {
    const { job: globalJob } = await upsertGlobalJob(job);
    if (!globalJob?.id) return null;

    const supabase = createServiceRoleClient();
    if (job.user_id) {
      await upsertUserInteraction(supabase, job.user_id, globalJob.id, {
        is_saved: true,
      });
    }
    return globalJob.id;
  } catch (e) {
    console.error("syncUserJobToFeed failed:", e);
    return null;
  }
}

/**
 * Copy a global (live-feed) job into the current user's own `jobs` table so it
 * shows up in "Meine Jobs". Reuses an existing linked row (by global_job_id or
 * by url) to avoid duplicates. Returns the user job row, or null on failure.
 */
export async function syncGlobalJobToUserJob(
  supabase: any,
  userId: string,
  globalJob: Record<string, any>,
  extra: Record<string, any> = {}
): Promise<Record<string, any> | null> {
  // 1. Already linked to a local copy?
  if (globalJob.id) {
    const { data: linked } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("global_job_id", globalJob.id)
      .maybeSingle();
    if (linked) return linked;
  }

  // 2. Reuse a row that was already synced by url (e.g. a manual job that was
  //    published to the feed) — just link it back.
  let existing: Record<string, any> | null = null;
  if (globalJob.url) {
    const { data: byUrl } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("url", globalJob.url)
      .maybeSingle();
    existing = byUrl ?? null;
  }

  if (existing) {
    if (globalJob.id) {
      await supabase.from("jobs").update({ global_job_id: globalJob.id }).eq("id", existing.id);
    }
    return existing;
  }

  // 3. Create a fresh local copy.
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      title: globalJob.title ?? "Untitled",
      platform: globalJob.platform ?? "Unknown",
      description: globalJob.description ?? "",
      budget: globalJob.budget ?? "",
      budget_type: globalJob.budget_type ?? null,
      budget_amount: globalJob.budget_amount ?? null,
      url: globalJob.url ?? "",
      skills: globalJob.skills ?? null,
      client_name: globalJob.client_name ?? null,
      client_country: globalJob.client_country ?? null,
      client_rating: globalJob.client_rating ?? null,
      category: globalJob.category ?? categorizeJob(globalJob),
      global_job_id: globalJob.id ?? null,
      posted_at: globalJob.posted_at ?? new Date().toISOString(),
      ...extra,
    })
    .select()
    .single();

  if (error) {
    console.error("syncGlobalJobToUserJob failed:", error.message);
    return null;
  }
  return data;
}

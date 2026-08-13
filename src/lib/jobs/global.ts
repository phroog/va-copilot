import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { categorizeJob } from "@/lib/jobs/scoring";

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

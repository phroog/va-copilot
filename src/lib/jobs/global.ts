import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Insert a job into the shared `global_jobs` feed.
 * Deduplicates on `url` (ON CONFLICT DO NOTHING semantics):
 * if the URL already exists we return the existing row.
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
    return existing ?? null;
  }

  return data;
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
    const globalJob = await upsertGlobalJob(job);
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

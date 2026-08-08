-- ═══════════════════════════════════════════════════════════════════
-- Job categories + skill matching + feed → own-jobs sync
-- 1. Every job falls into a category derived from its read text.
-- 2. Skill matching stores the matched skills per user interaction.
-- 3. Saving a live-feed job also creates a copy in the user's own `jobs`
--    table, linked back via global_job_id (so it appears in "Meine Jobs").
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Category per job (shared feed + user's own jobs) ──────────
alter table global_jobs add column if not exists category text;
alter table jobs add column if not exists category text;

create index if not exists global_jobs_category_idx on global_jobs (category);
create index if not exists jobs_category_idx on jobs (category);

-- ── 2. Matched skills from skill matching ─────────────────────────
alter table user_job_interactions add column if not exists matched_skills text[] default '{}';

-- ── 3. Link a user's own job back to the global feed job ──────────
alter table jobs add column if not exists global_job_id uuid;
create index if not exists jobs_global_job_id_idx on jobs (global_job_id);

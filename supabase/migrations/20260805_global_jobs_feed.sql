-- ═══════════════════════════════════════════════════════════════════
-- Centralized Global Live Job Feed
-- Tables: job_sources, global_jobs, user_job_interactions
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Job sources (RSS / API / web) ──────────────────────────────
create table if not exists job_sources (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  source_type text not null check (source_type in ('rss', 'api', 'web')),
  url text,
  platform text,
  is_active boolean default true,
  include_in_live_feed boolean default true,
  last_collected_at timestamptz,
  created_at timestamptz default now(),
  unique (name)
);

alter table job_sources enable row level security;

create policy "Authenticated users can view job sources"
  on job_sources for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert job sources"
  on job_sources for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update job sources"
  on job_sources for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete job sources"
  on job_sources for delete
  using (auth.role() = 'authenticated');

-- Preset job sources (only inserted if not already present)
insert into job_sources (name, source_type, url, platform, is_active, include_in_live_feed)
values
  ('Upwork', 'rss', 'https://www.upwork.com/ab/feed/jobs/rss', 'Upwork', true, true),
  ('OnlineJobs.ph', 'rss', 'https://www.onlinejobs.ph/jobs/rss', 'OnlineJobs.ph', true, true),
  ('LinkedIn Jobs', 'web', 'https://www.linkedin.com/jobs/', 'LinkedIn', true, true),
  ('Indeed', 'web', 'https://www.indeed.com/', 'Indeed', true, true)
on conflict (name) do nothing;

-- ── 2. Global jobs (shared live feed) ──────────────────────────────
create table if not exists global_jobs (
  id uuid default gen_random_uuid() primary key,
  source_id uuid references job_sources(id) on delete set null,
  external_id text,
  title text not null,
  description text,
  budget text,
  url text not null unique,
  platform text,
  skills text[],
  client_name text,
  client_country text,
  client_rating numeric,
  posted_at timestamptz,
  collected_at timestamptz default now()
);

-- Public read for authenticated users; writes are restricted to the
-- service role / admin key (no insert/update/delete policies here).
alter table global_jobs enable row level security;

create policy "Authenticated users can view global jobs"
  on global_jobs for select
  using (auth.role() = 'authenticated');

-- Realtime support: return full rows and publish inserts
alter table global_jobs replica identity full;

do $$
begin
  alter publication supabase_realtime add table global_jobs;
exception
  when duplicate_object then null;
end $$;

-- ── 3. Per-user interactions with global jobs ─────────────────────
create table if not exists user_job_interactions (
  user_id uuid references auth.users(id) on delete cascade not null,
  global_job_id uuid references global_jobs(id) on delete cascade not null,
  is_saved boolean default false,
  is_applied boolean default false,
  pitch_id uuid references pitches(id) on delete set null,
  matching_score integer,
  updated_at timestamptz default now(),
  unique (user_id, global_job_id)
);

alter table user_job_interactions enable row level security;

create policy "Users can view own interactions"
  on user_job_interactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own interactions"
  on user_job_interactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own interactions"
  on user_job_interactions for update
  using (auth.uid() = user_id);

-- ── 4. Helpful indexes ─────────────────────────────────────────────
create index if not exists global_jobs_collected_at_idx on global_jobs (collected_at desc);
create index if not exists global_jobs_source_id_idx on global_jobs (source_id);
create index if not exists user_job_interactions_user_id_idx on user_job_interactions (user_id);
create index if not exists user_job_interactions_global_job_id_idx on user_job_interactions (global_job_id);

-- Tracks which global jobs a user has opened/unlocked (My Matches view).
-- Persists across days so the user's collection accumulates.
create table if not exists user_opened_jobs (
  user_id uuid references auth.users(id) on delete cascade,
  global_job_id uuid references global_jobs(id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (user_id, global_job_id)
);

alter table user_opened_jobs enable row level security;

drop policy if exists "Users manage own opened jobs" on user_opened_jobs;
create policy "Users manage own opened jobs"
  on user_opened_jobs for all using (auth.uid() = user_id);
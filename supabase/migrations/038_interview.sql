-- AI Interview Simulator sessions
create table if not exists interview_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  scenario text default '',
  job_id uuid references jobs(id) on delete set null,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  result jsonb,
  status text not null default 'active' check (status in ('active','done')),
  created_at timestamptz not null default now()
);

alter table interview_sessions enable row level security;

drop policy if exists "Users manage own interviews" on interview_sessions;
create policy "Users manage own interviews"
  on interview_sessions for all using (auth.uid() = user_id);
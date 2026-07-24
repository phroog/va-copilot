create table if not exists scam_check_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  job_id uuid references jobs(id) on delete set null,
  client_name text default '',
  website_url text default '',
  score integer not null,
  analysis text not null,
  created_at timestamptz default now()
);

alter table scam_check_results enable row level security;

create policy "Users can view own scam checks"
  on scam_check_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own scam checks"
  on scam_check_results for insert
  with check (auth.uid() = user_id);

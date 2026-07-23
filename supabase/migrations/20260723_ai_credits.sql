-- AI Credits & Usage Log tables
-- Run this in Supabase SQL editor

create table if not exists ai_credits (
  user_id uuid primary key references auth.users on delete cascade,
  balance int default 100,
  total_used int default 0
);

alter table ai_credits enable row level security;

create policy "Users can read own credits"
  on ai_credits for select
  using (auth.uid() = user_id);

create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  tokens_input int default 0,
  tokens_output int default 0,
  cost numeric(10,6) default 0,
  created_at timestamptz default now()
);

alter table ai_usage_log enable row level security;

create policy "Users can read own usage log"
  on ai_usage_log for select
  using (auth.uid() = user_id);

-- Insert initial credits for existing users (run once)
-- insert into ai_credits (user_id, balance) select id, 100 from auth.users on conflict do nothing;

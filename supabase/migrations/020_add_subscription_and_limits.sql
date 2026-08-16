-- Subscription tiers & daily job-view limits
-- Plans: free (20 jobs/day), basic ($5/mo, 100/day), pro ($10/mo, unlimited)

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan text not null default 'free' check (plan in ('free','basic','pro')),
  status text not null default 'active' check (status in ('active','cancelled','past_due')),
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

alter table subscriptions enable row level security;

drop policy if exists "Users can read own subscription" on subscriptions;
create policy "Users can read own subscription"
  on subscriptions for select using (auth.uid() = user_id);

create table if not exists user_job_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  view_date date not null default current_date,
  count int not null default 0,
  unique (user_id, view_date)
);

alter table user_job_views enable row level security;

drop policy if exists "Users can read own views" on user_job_views;
drop policy if exists "Users can upsert own views" on user_job_views;
create policy "Users can read own views"
  on user_job_views for select using (auth.uid() = user_id);
create policy "Users can upsert own views"
  on user_job_views for insert with check (auth.uid() = user_id);
create policy "Users can update own views"
  on user_job_views for update using (auth.uid() = user_id);

-- Per-plan limits (also reflected on profiles for quick reads).
alter table profiles add column if not exists daily_job_limit int not null default 20;
alter table profiles add column if not exists monthly_ai_credits int not null default 5;

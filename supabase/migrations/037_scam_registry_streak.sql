-- ═══════════════════════════════════════════════════════════════
-- Scam Registry (community-flagged, AI-suggested, admin-approved)
-- ═══════════════════════════════════════════════════════════════
create table if not exists scam_registry (
  id uuid default gen_random_uuid() primary key,
  domain text not null,
  company_name text default '',
  description text default '',
  risk text not null default 'medium' check (risk in ('low','medium','high')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  flagged_by uuid references auth.users(id) on delete set null,
  votes_up int not null default 0,
  votes_down int not null default 0,
  created_at timestamptz not null default now(),
  unique (domain)
);

create table if not exists scam_registry_votes (
  user_id uuid references auth.users(id) on delete cascade,
  entry_id uuid references scam_registry(id) on delete cascade,
  vote boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

alter table scam_registry enable row level security;
alter table scam_registry_votes enable row level security;

drop policy if exists "read approved registry" on scam_registry;
drop policy if exists "insert registry" on scam_registry;
create policy "read approved registry"
  on scam_registry for select using (auth.role() = 'authenticated' and status = 'approved');
create policy "insert registry"
  on scam_registry for insert with check (auth.uid() is not null);

drop policy if exists "read own votes" on scam_registry_votes;
drop policy if exists "insert own votes" on scam_registry_votes;
drop policy if exists "update own votes" on scam_registry_votes;
create policy "read own votes"
  on scam_registry_votes for select using (auth.uid() = user_id);
create policy "insert own votes"
  on scam_registry_votes for insert with check (auth.uid() = user_id);
create policy "update own votes"
  on scam_registry_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- Dream Streak (daily activity + milestone rewards)
-- ═══════════════════════════════════════════════════════════════
alter table profiles add column if not exists streak_count int not null default 0;
alter table profiles add column if not exists last_active_date date;
alter table profiles add column if not exists streak_claimed jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists free_month_available boolean not null default false;
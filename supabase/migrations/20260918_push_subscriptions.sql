-- =============================================================
-- Sari Learn — web push subscriptions for notifications.
-- =============================================================

create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  keys jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

drop policy if exists "own subs select" on push_subscriptions;
drop policy if exists "own subs insert" on push_subscriptions;
drop policy if exists "own subs delete" on push_subscriptions;
create policy "own subs select" on push_subscriptions for select using (auth.uid() = user_id);
create policy "own subs insert" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "own subs delete" on push_subscriptions for delete using (auth.uid() = user_id);
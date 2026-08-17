-- Swap tracking, daily bonus, wheel of fortune
alter table user_job_views add column if not exists swaps int not null default 0;
alter table user_job_views add column if not exists bonus int not null default 0;

alter table user_job_interactions add column if not exists swapped boolean default false;

create table if not exists user_wheel_spins (
  user_id uuid references auth.users on delete cascade not null,
  spin_date date not null default current_date,
  reward jsonb,
  created_at timestamptz default now(),
  primary key (user_id, spin_date)
);

alter table user_wheel_spins enable row level security;
drop policy if exists "Users read own spins" on user_wheel_spins;
drop policy if exists "Users insert own spins" on user_wheel_spins;
create policy "Users read own spins"
  on user_wheel_spins for select using (auth.uid() = user_id);
create policy "Users insert own spins"
  on user_wheel_spins for insert with check (auth.uid() = user_id);

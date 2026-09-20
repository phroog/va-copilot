-- =============================================================
-- Sari — push reminder rate-limiting. The cron job writes here so
-- users aren't bombarded: each (user, kind) tracks its last send,
-- and grind reminders count per UTC day with a cooldown.
-- =============================================================

create table if not exists push_reminders (
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null,
  last_sent_at timestamptz,
  day text,
  day_count int not null default 0,
  primary key (user_id, kind)
);

alter table push_reminders enable row level security;
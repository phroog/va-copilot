-- =============================================================
-- Sari — operator grants per user (admin can gift things like
-- unlimited playtime, bonus lessons, notes).
-- =============================================================

create table if not exists user_grants (
  user_id uuid references auth.users(id) on delete cascade not null primary key,
  unlimited_playtime boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);
alter table user_grants enable row level security;
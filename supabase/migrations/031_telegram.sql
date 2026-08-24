-- Telegram integration: user<->chat linking + notification preferences

-- Pending verification codes (generated in Sari, confirmed via the bot)
create table if not exists telegram_links (
  user_id uuid references auth.users on delete cascade primary key,
  chat_id bigint not null,
  username text default '',
  created_at timestamptz default now()
);

create table if not exists telegram_verify_codes (
  user_id uuid references auth.users on delete cascade primary key,
  code text not null,
  created_at timestamptz default now()
);

-- Per-user notification preferences for Telegram
alter table user_settings add column if not exists telegram_enabled boolean default false;
alter table user_settings add column if not exists telegram_push_matches boolean default false;
alter table user_settings add column if not exists telegram_push_followups boolean default false;
alter table user_settings add column if not exists telegram_push_invoices boolean default false;
alter table user_settings add column if not exists telegram_push_scam boolean default false;

alter table user_settings add column if not exists telegram_pushed_jobs jsonb default '[]'::jsonb;

alter table telegram_links enable row level security;
alter table telegram_verify_codes enable row level security;

drop policy if exists "Users read own telegram link" on telegram_links;
drop policy if exists "Users insert own telegram link" on telegram_links;
drop policy if exists "Users delete own telegram link" on telegram_links;
create policy "Users read own telegram link"
  on telegram_links for select using (auth.uid() = user_id);
create policy "Users insert own telegram link"
  on telegram_links for insert with check (auth.uid() = user_id);
create policy "Users delete own telegram link"
  on telegram_links for delete using (auth.uid() = user_id);

-- verify codes are managed via the service role only (no direct user RLS needed,
-- but keep them readable by owner to show status)
drop policy if exists "Users read own verify code" on telegram_verify_codes;
create policy "Users read own verify code"
  on telegram_verify_codes for select using (auth.uid() = user_id);

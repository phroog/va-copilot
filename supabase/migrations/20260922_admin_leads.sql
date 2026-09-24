-- =============================================================
-- Sari — admin/operator data: funnel leads (who entered the dream
-- funnel, what they picked) + feed messages the operator can send
-- to users (with a chosen sender name), delivered in the app feed.
-- =============================================================

create table if not exists funnel_leads (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  whatsapp text,
  path text,
  persona text,
  plan text,
  created_at timestamptz not null default now()
);
alter table funnel_leads enable row level security;

create table if not exists feed_messages (
  id uuid default gen_random_uuid() primary key,
  recipient_email text,          -- null = broadcast to everyone
  sender_name text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table feed_messages enable row level security;

create table if not exists feed_message_reads (
  user_id uuid not null,
  message_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table feed_message_reads enable row level security;
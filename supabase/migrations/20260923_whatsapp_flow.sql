-- =============================================================
-- Sari — WhatsApp qualification flow (deterministic button bot) +
-- Cal.com booking + follow-up scheduling.
-- =============================================================

create table if not exists whatsapp_sessions (
  phone text not null primary key,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table whatsapp_sessions
  add column if not exists stage text not null default 'new',
  add column if not exists people int,
  add column if not exists booked_url text,
  add column if not exists booked_at timestamptz,
  add column if not exists first_seen_at timestamptz,
  add column if not exists followup_at timestamptz,
  add column if not exists followup_sent boolean not null default false;

alter table whatsapp_sessions enable row level security;
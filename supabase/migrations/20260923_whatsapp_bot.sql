-- =============================================================
-- Sari — WhatsApp bot: conversation sessions per phone number so
-- the DeepSeek qualification bot remembers context across messages.
-- =============================================================

create table if not exists whatsapp_sessions (
  phone text not null primary key,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table whatsapp_sessions enable row level security;
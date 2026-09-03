-- ═══════════════════════════════════════════════════════════════
-- Support Letter Box — users submit needs, problems & feedback
-- ═══════════════════════════════════════════════════════════════
create table if not exists support_letters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  category text not null default 'other',
  urgency text not null default 'medium',
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now()
);

create index if not exists support_letters_user_idx on support_letters (user_id, created_at desc);

alter table support_letters enable row level security;

drop policy if exists "read own letters" on support_letters;
drop policy if exists "insert own letters" on support_letters;

create policy "read own letters"
  on support_letters for select using (auth.uid() = user_id);

create policy "insert own letters"
  on support_letters for insert with check (auth.uid() = user_id);

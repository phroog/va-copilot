-- User notes table for extension sync
create table if not exists user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  content text default '',
  updated_at timestamptz default now()
);

alter table user_notes enable row level security;

create policy "Users can manage own notes"
  on user_notes for all
  using (auth.uid() = user_id);

-- =============================================================
-- Sari Learn — per-user unique skill trees (fingerprint growth).
-- Each user's tree is generated once, deterministically seeded by
-- user_id + path_id, so every user's tree grows differently.
-- =============================================================

create table if not exists user_skill_trees (
  user_id uuid references auth.users(id) on delete cascade not null,
  path_id uuid references va_paths(id) on delete cascade not null,
  tree jsonb not null default '[]',   -- [{node_id, parent_id, depth, order_index}]
  seed text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, path_id)
);

alter table user_skill_trees enable row level security;

drop policy if exists "own trees select" on user_skill_trees;
drop policy if exists "own trees insert" on user_skill_trees;
drop policy if exists "own trees update" on user_skill_trees;
create policy "own trees select" on user_skill_trees for select using (auth.uid() = user_id);
create policy "own trees insert" on user_skill_trees for insert with check (auth.uid() = user_id);
create policy "own trees update" on user_skill_trees for update using (auth.uid() = user_id);
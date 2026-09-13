-- =============================================================
-- Sari Learn — Tree of Masters (Path-of-Exile style giant tree).
-- The graph itself is generated deterministically in app code;
-- only each user's activated nodes are stored here.
-- =============================================================

create table if not exists user_tree_nodes (
  user_id uuid references auth.users(id) on delete cascade not null,
  node_id text not null,
  activated_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

alter table user_tree_nodes enable row level security;

drop policy if exists "own tree nodes select" on user_tree_nodes;
drop policy if exists "own tree nodes insert" on user_tree_nodes;
create policy "own tree nodes select" on user_tree_nodes for select using (auth.uid() = user_id);
create policy "own tree nodes insert" on user_tree_nodes for insert with check (auth.uid() = user_id);
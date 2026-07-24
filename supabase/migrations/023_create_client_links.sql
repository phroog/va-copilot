-- Client Links table for storing shortcuts per client
create table if not exists client_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  job_id uuid references jobs(id) on delete set null,
  client_name text not null,
  title text not null,
  url text not null,
  link_type text check (link_type in ('website', 'project', 'communication', 'other')) default 'other',
  created_at timestamptz default now()
);

alter table client_links enable row level security;

create policy "Users can view own client links"
  on client_links for select
  using (auth.uid() = user_id);

create policy "Users can insert own client links"
  on client_links for insert
  with check (auth.uid() = user_id);

create policy "Users can update own client links"
  on client_links for update
  using (auth.uid() = user_id);

create policy "Users can delete own client links"
  on client_links for delete
  using (auth.uid() = user_id);
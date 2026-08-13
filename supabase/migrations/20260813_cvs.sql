-- CV / resume storage
-- data: structured CV sections (jsonb) used to render the PDF and to inject
--       into AI prompts; file_url: uploaded document (PDF/image) for sharing.
create table if not exists cvs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  data jsonb default '{}'::jsonb,
  file_url text,
  file_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table cvs enable row level security;

drop policy if exists "Users can view own cv" on cvs;
drop policy if exists "Users can insert own cv" on cvs;
drop policy if exists "Users can update own cv" on cvs;

create policy "Users can view own cv"
  on cvs for select using (auth.uid() = user_id);
create policy "Users can insert own cv"
  on cvs for insert with check (auth.uid() = user_id);
create policy "Users can update own cv"
  on cvs for update using (auth.uid() = user_id);

-- Public storage bucket for CV files (PDF generated or uploaded).
insert into storage.buckets (id, name, public, file_size_limit)
values ('cvs', 'cvs', true, 10485760)
on conflict (id) do nothing;

drop policy if exists "Public read cv files" on storage.objects;
drop policy if exists "Users can upload own cv files" on storage.objects;
drop policy if exists "Users can update own cv files" on storage.objects;

create policy "Public read cv files"
  on storage.objects for select using (bucket_id = 'cvs');
create policy "Users can upload own cv files"
  on storage.objects for insert
  with check (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update own cv files"
  on storage.objects for update
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

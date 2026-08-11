-- ═══════════════════════════════════════════════════════════════════
-- Per-source search keywords for the web collector.
--
-- The admin sets keywords in the Admin Dashboard (one list per job
-- source) and the collector fetches them per source while polling,
-- instead of using a single global SEARCH_KEYWORDS env list.
-- Falls back to collector-level defaults when a source has no keywords.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists job_source_keywords (
  id uuid default gen_random_uuid() primary key,
  source_id uuid references job_sources(id) on delete cascade not null,
  keyword text not null,
  position integer default 0,
  created_at timestamptz default now()
);

alter table job_source_keywords enable row level security;

drop policy if exists "Authenticated users can view source keywords" on job_source_keywords;
drop policy if exists "Authenticated users can edit source keywords" on job_source_keywords;

-- Readable by any authenticated user (feed pages may need them later);
-- writes are only done by the admin dashboard via service-role client.
create policy "Authenticated users can view source keywords"
  on job_source_keywords for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can edit source keywords"
  on job_source_keywords for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update source keywords"
  on job_source_keywords for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete source keywords"
  on job_source_keywords for delete
  using (auth.role() = 'authenticated');

create index if not exists job_source_keywords_source_id_idx on job_source_keywords (source_id);
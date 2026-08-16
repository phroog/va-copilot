-- Deep-detail enrichment: full description + extra fields fetched from the
-- platform's job detail page (bounded, done by the polling extension).
alter table global_jobs add column if not exists detail jsonb;

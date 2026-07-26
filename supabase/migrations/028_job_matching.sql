-- Add profile fields for job matching
alter table profiles add column if not exists skills text[] default '{}';
alter table profiles add column if not exists experience_level text default 'beginner';
alter table profiles add column if not exists job_categories text[] default '{}';

-- Add score fields to jobs table
alter table jobs add column if not exists score integer;
alter table jobs add column if not exists match_reason text;

-- 5-dimensional job/user fingerprint (deterministic, no AI)
-- global_jobs.profile_vector = job classification (5 ints, 1-5)
-- profiles.job_vector        = user preference vector (5 ints, 1-5)
alter table global_jobs add column if not exists profile_vector int[];
alter table profiles add column if not exists job_vector int[];

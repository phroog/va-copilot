-- =============================================================
-- Sari Learn — performance tracking (speed/accuracy bests per level)
-- + badge portfolio columns so the Badge page can act as a scouted
-- business card with editable activities & projects.
-- =============================================================

alter table learn_progress
  add column if not exists best_accuracy numeric not null default 0,
  add column if not exists best_speed_ratio numeric not null default 1.5,
  add column if not exists best_xp int not null default 0;

alter table profiles
  add column if not exists badge_activities jsonb not null default '[]'::jsonb,
  add column if not exists badge_projects jsonb not null default '[]'::jsonb;
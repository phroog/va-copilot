-- =============================================================
-- Sari — Daily Energy system (Duolingo-style plan limits) +
-- badge tagline for the shareable profile.
-- FREE: 1 lesson/day, no sim, no leaderboard rank, badge paused.
-- BLOOM: 2 lessons/day + 5 client-sim scenarios, ranked, scouted.
-- Money Club: unlimited, top scout pool, verified badge.
-- =============================================================

alter table profiles
  add column if not exists daily_date text,
  add column if not exists lessons_today int not null default 0,
  add column if not exists sim_today int not null default 0,
  add column if not exists bonus_lessons_today int not null default 0,
  add column if not exists badge_tagline text not null default '';
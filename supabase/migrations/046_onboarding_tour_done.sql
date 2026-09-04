-- ═══════════════════════════════════════════════════════════════
-- First-run workspace tour — shown exactly ONCE per user (server-side flag,
-- so clearing the browser never re-shows it).
-- ═══════════════════════════════════════════════════════════════
alter table user_settings add column if not exists onboarding_tour_done boolean not null default false;

-- Existing users have already used the app: never show them the tour.
update user_settings set onboarding_tour_done = true;
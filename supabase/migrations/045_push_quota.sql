-- ═══════════════════════════════════════════════════════════════
-- Daily push quota for realtime Telegram job pushes.
-- Bloom (basic) gets at most its dailyJobLimit (100) live job pushes per day;
-- Money Club (pro) is unlimited. The counter resets each UTC day.
-- ═══════════════════════════════════════════════════════════════
alter table user_settings add column if not exists push_day text;
alter table user_settings add column if not exists push_count int not null default 0;
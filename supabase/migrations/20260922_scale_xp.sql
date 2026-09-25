-- =============================================================
-- Sari — scale the XP economy ×50 so the leaderboard looks like
-- months of grinding. Applies to existing users, progress and bots.
-- =============================================================

update leaderboard_bots set base_xp = base_xp * 50;
update profiles set xp = xp * 50;
update learn_progress set xp_earned = xp_earned * 50, best_xp = best_xp * 50;
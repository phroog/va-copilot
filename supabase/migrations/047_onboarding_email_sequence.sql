-- ═══════════════════════════════════════════════════════════════
-- Onboarding email sequence (3 steps) for NEW users.
-- onboarding_email_step: 0 = welcome sent, 1 = email 2 sent,
-- 2 = email 3 sent, 3 = done. Existing users are marked done so only
-- fresh signups enter the sequence.
-- ═══════════════════════════════════════════════════════════════
alter table user_settings add column if not exists onboarding_email_step int not null default 0;

-- Mark every existing user as done (their accounts predate the sequence).
insert into user_settings (user_id, onboarding_email_step)
select id, 3 from auth.users
on conflict (user_id) do update set onboarding_email_step = 3;

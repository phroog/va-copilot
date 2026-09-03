-- ═══════════════════════════════════════════════════════════════
-- Email notification prefs (Konfiguration tab, step 1)
-- ═══════════════════════════════════════════════════════════════
alter table user_settings add column if not exists notification_email text;

-- Where new matching jobs + marketing emails are sent. NULL = fall back to the
-- account email. opt_out keeps existing behavior (email_opt_out on profiles).
alter table user_settings add column if not exists email_push_matches boolean default false;
alter table user_settings add column if not exists email_marketing_opt_in boolean default true;
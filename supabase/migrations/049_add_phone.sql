-- ═══════════════════════════════════════════════════════════════
-- Store the user's WhatsApp/phone number for speed-to-lead messaging.
-- ═══════════════════════════════════════════════════════════════
alter table user_settings add column if not exists phone text;

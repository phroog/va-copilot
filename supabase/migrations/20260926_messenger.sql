-- =============================================================
-- Sari — support a second channel (Facebook Messenger) alongside
-- WhatsApp. The `phone` column stays the session key (a phone number
-- for WhatsApp, the PSID for Messenger); channel/channel_id identify
-- where to send replies. Everything else (flow, AI, Cal) is shared.
-- =============================================================

alter table whatsapp_sessions
  add column if not exists channel text not null default 'whatsapp',
  add column if not exists channel_id text;
-- =============================================================
-- Sari — WhatsApp/Cal.com: map bookings back to WhatsApp conversations
-- by EMAIL (Cal.com always has the attendee email), so confirmations
-- no longer depend on a phone number.
-- =============================================================

alter table whatsapp_sessions add column if not exists email text;
-- =============================================================
-- Sari — WhatsApp/Cal.com: store the booked call time so the AI bot
-- can answer "when is the call / what's the link" from chat context.
-- =============================================================

alter table whatsapp_sessions add column if not exists booked_start text;
-- =============================================================
-- Sari — WhatsApp/Cal.com: store the booking timezone so call times
-- are shown in the user's/event's local time (not server UTC).
-- =============================================================

alter table whatsapp_sessions add column if not exists booked_tz text;
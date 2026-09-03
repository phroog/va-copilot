-- ═══════════════════════════════════════════════════════════════
-- PERSISTENT config for the realtime Telegram push.
-- The trigger (032) reads app.telegram_push_url / app.telegram_push_secret
-- via current_setting(). `set_config(..., false)` from the SQL editor is only
-- session-scoped and vanishes — that's why the push silently stopped working.
-- ALTER ROLE makes them stick for every future connection (incl. the collector).
-- ═══════════════════════════════════════════════════════════════

alter role postgres set app.telegram_push_url =
  'https://va-copilot-theta.vercel.app/api/telegram/realtime';

-- IMPORTANT: replace <YOUR_PUSH_SECRET> with the value of TELEGRAM_PUSH_SECRET
-- from your local .env.local (C:\Users\Surface\Desktop\Sari\.env.local).
alter role postgres set app.telegram_push_secret =
  '<YOUR_PUSH_SECRET>';

-- Applies to new connections; nothing to run after this except verifying.
-- To confirm afterwards:
--   select current_setting('app.telegram_push_url', true);
--   select current_setting('app.telegram_push_secret', true);
-- (these show the values only inside the SQL-editor session, but the ALTER ROLE
--  guarantees they are set for every new backend automatically)
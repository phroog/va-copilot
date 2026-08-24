-- Real-time Telegram push for new matching jobs.
-- Uses pg_net to fire an async HTTP POST to the Supabase Edge Function
-- `telegram-push` whenever a new row is inserted into global_jobs.
-- The Edge Function does the matching + dedup + sends the Telegram message.

-- Enable pg_net if not already (pg_net is a Supabase add-on; in most projects
-- it is pre-enabled. This guards the schema but pg_net itself is enabled in
-- the dashboard).
create extension if not exists pg_net;

-- The function called by the AFTER INSERT trigger. It must run as the
-- postgres role (SECURITY DEFINER) because triggers run with the inserting
-- user's privileges, and the collector inserts via service-role/anonymous.
create or replace function public.telegram_push_on_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Fire-and-forget HTTP POST to the Edge Function.
  -- Edge Function URL: https://<project-ref>.supabase.co/functions/v1/telegram-push
  -- The secret is optional but recommended (see .env example).
  perform net.http_post(
    url := current_setting('app.telegram_push_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.telegram_push_secret', true)
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists trg_telegram_push_on_job on global_jobs;
create trigger trg_telegram_push_on_job
  after insert on global_jobs
  for each row
  execute function public.telegram_push_on_job();

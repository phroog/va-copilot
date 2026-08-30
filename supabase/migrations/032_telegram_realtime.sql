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
  -- Only fire the HTTP request when the push URL is configured. Otherwise this
  -- trigger MUST be a no-op: a pg_net call with a NULL url raises a not-null
  -- error that rolls back the whole global_jobs insert (breaking every upload).
  if current_setting('app.telegram_push_url', true) is not null then
    perform net.http_post(
      url := current_setting('app.telegram_push_url', true),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.telegram_push_secret', true)
      ),
      body := jsonb_build_object('record', to_jsonb(new))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_telegram_push_on_job on global_jobs;
create trigger trg_telegram_push_on_job
  after insert on global_jobs
  for each row
  execute function public.telegram_push_on_job();

-- ── Follow-up reminder: when a new follow-up is created, notify via Telegram ──
create or replace function public.telegram_push_on_followup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.telegram_push_url', true) is not null then
    perform net.http_post(
      url := current_setting('app.telegram_push_url', true),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.telegram_push_secret', true)
      ),
      body := jsonb_build_object('record', to_jsonb(new))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_telegram_push_on_followup on follow_ups;
create trigger trg_telegram_push_on_followup
  after insert on follow_ups
  for each row
  execute function public.telegram_push_on_followup();

-- ═══════════════════════════════════════════════════════════════
-- Robust realtime Telegram push config.
-- The pg_net trigger must know the Vercel endpoint + a shared secret. Instead
-- of fragile session-scoped app.* settings, we store them in a tiny table that
-- the service role can populate via the API (no SQL editor needed).
-- ═══════════════════════════════════════════════════════════════

create table if not exists telegram_push_config (
  key text primary key,
  value text not null
);

-- Default URL is public and safe to hardcode as the fallback.
insert into telegram_push_config (key, value)
values ('url', 'https://va-copilot-theta.vercel.app/api/telegram/realtime')
on conflict (key) do nothing;

-- Row-level: service role manages it; nothing sensitive exposed to anon/users.
alter table telegram_push_config enable row level security;
drop policy if exists "service role manages telegram config" on telegram_push_config;
create policy "service role manages telegram config"
  on telegram_push_config for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Rewrite the job trigger to read URL + secret from the table. The secret is
-- fetched at fire time, so updating the table row is enough to rotate it.
create or replace function public.telegram_push_on_job()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from telegram_push_config where key = 'url';
  select value into v_secret from telegram_push_config where key = 'secret';
  if v_url is not null and v_secret is not null then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body := jsonb_build_object('record', to_jsonb(new))
    );
  end if;
  return new;
end;
$$;

-- Rewrite the follow-up trigger the same way.
create or replace function public.telegram_push_on_followup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from telegram_push_config where key = 'url';
  select value into v_secret from telegram_push_config where key = 'secret';
  if v_url is not null and v_secret is not null then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body := jsonb_build_object('record', to_jsonb(new))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_telegram_push_on_job on global_jobs;
create trigger trg_telegram_push_on_job
  after insert on global_jobs for each row
  execute function public.telegram_push_on_job();

drop trigger if exists trg_telegram_push_on_followup on follow_ups;
create trigger trg_telegram_push_on_followup
  after insert on follow_ups for each row
  execute function public.telegram_push_on_followup();
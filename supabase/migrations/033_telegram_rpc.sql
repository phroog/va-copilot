-- Telegram RPC: the webhook runs WITHOUT a user session, so it cannot read
-- RLS-protected tables directly. These SECURITY DEFINER functions let the
-- bot verify codes and resolve chats while keeping the tables RLS-locked.

-- Link a Telegram chat to a Sari account after verifying a 6-digit code.
create or replace function public.telegram_link_account(
  p_code text,
  p_chat_id bigint,
  p_username text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- find the code
  select user_id into v_user_id
  from telegram_verify_codes
  where code = p_code
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- link the chat (one chat per user, latest wins)
  insert into telegram_links (user_id, chat_id, username)
  values (v_user_id, p_chat_id, coalesce(p_username, ''))
  on conflict (user_id) do update
    set chat_id = excluded.chat_id, username = excluded.username, created_at = now();

  -- enable telegram pushes by default
  insert into user_settings (user_id, telegram_enabled)
  values (v_user_id, true)
  on conflict (user_id) do update set telegram_enabled = true;

  -- consume the code
  delete from telegram_verify_codes where user_id = v_user_id;

  return jsonb_build_object('ok', true, 'user_id', v_user_id);
end;
$$;

-- Resolve a chat_id to its linked Sari user (for inbound bot commands).
create or replace function public.telegram_user_for_chat(p_chat_id bigint)
returns uuid
language sql
security definer
set search_path = public
as $$
  select user_id from telegram_links where chat_id = p_chat_id limit 1;
$$;

-- Allow the webhook (called anonymously by Telegram) to invoke these.
grant execute on function public.telegram_link_account(text, bigint, text) to anon, authenticated, service_role;
grant execute on function public.telegram_user_for_chat(bigint) to anon, authenticated, service_role;
-- Fix: telegram_verify_codes had only a SELECT policy, so the "Code
-- generieren" button (authenticated user inserting their own code) was blocked
-- by RLS → no code was ever stored → bot reported "ungültiger Code".
drop policy if exists "Users insert own verify code" on telegram_verify_codes;
create policy "Users insert own verify code"
  on telegram_verify_codes for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own verify code" on telegram_verify_codes;
create policy "Users update own verify code"
  on telegram_verify_codes for update using (auth.uid() = user_id);

drop policy if exists "Users delete own verify code" on telegram_verify_codes;
create policy "Users delete own verify code"
  on telegram_verify_codes for delete using (auth.uid() = user_id);
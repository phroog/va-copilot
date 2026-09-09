-- Store the user's onboarding goal so the admin HQ can show what each
-- signup selected.
alter table profiles add column if not exists goal text;

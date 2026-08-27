-- Marketing email opt-out preference
alter table profiles add column if not exists email_opt_out boolean default false;
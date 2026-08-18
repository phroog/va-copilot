-- Currency + tax management
alter table profiles add column if not exists base_currency text default 'EUR';

alter table income_log add column if not exists currency text default 'USD';
alter table income_log add column if not exists invoice_id uuid references invoices(id) on delete set null;

alter table invoices add column if not exists currency text default 'USD';
alter table time_entries add column if not exists currency text default 'USD';

alter table user_settings add column if not exists default_tax_rate numeric(5,2) default 0;
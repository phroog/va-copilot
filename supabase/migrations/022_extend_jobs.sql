-- Extend jobs table with rich fields for extension extraction
alter table jobs add column if not exists budget_type text;
alter table jobs add column if not exists budget_amount text;
alter table jobs add column if not exists client_name text;
alter table jobs add column if not exists client_country text;
alter table jobs add column if not exists client_rating numeric;
alter table jobs add column if not exists client_total_spent text;
alter table jobs add column if not exists skills text[];

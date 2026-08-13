-- Agency section visibility (paid long-term; toggled in Settings for now).
alter table user_settings add column if not exists agency_enabled boolean default false;

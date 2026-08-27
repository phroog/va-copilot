-- Grace period: after a subscription ends the user keeps access for a few
-- extra days before dropping back to the free tier.
alter table subscriptions add column if not exists access_until timestamptz;
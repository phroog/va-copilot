-- ═══════════════════════════════════════════════════════════════
-- Allow the 'pass' subscription status used by one-time access passes
-- (daily + monthly). Previously the CHECK constraint only allowed
-- active/cancelled/past_due, so pass purchases silently failed to grant
-- access (the webhook upsert was rejected).
-- ═══════════════════════════════════════════════════════════════
alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check
  check (status in ('active','cancelled','past_due','pass'));

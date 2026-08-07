-- 012_feedback_triage.sql
-- Supports the hourly feedback-triage cron (a Hermes scheduled job, not app
-- code). The cron reads open feedback, brings new items to the owner's
-- attention, fixes clear bugs, and asks about out-of-scope requests. These
-- columns let it mark what it has already handled so items aren't re-processed.

alter table public.feedback
  add column if not exists triaged_at timestamptz,
  add column if not exists triage_note text;

comment on column public.feedback.triaged_at is
  'Set by the hourly feedback-triage cron when an item has been reviewed/handled, so it is not re-processed.';

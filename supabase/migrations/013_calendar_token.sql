-- 013_calendar_token.sql
-- Per-user secret token for subscribable ICS calendar feeds. Calendar apps
-- (Google/Apple/Outlook) fetch the feed URL with NO login session, so the feed
-- is authenticated by an unguessable token embedded in the URL rather than a
-- cookie. The token can be regenerated to revoke old subscription links.

alter table public.profiles
  add column if not exists calendar_token uuid not null default gen_random_uuid();

-- Backfill is automatic via the default for existing rows created before this
-- column existed (Postgres fills the default on ADD COLUMN). Enforce uniqueness.
create unique index if not exists idx_profiles_calendar_token
  on public.profiles(calendar_token);

comment on column public.profiles.calendar_token is
  'Unguessable token used to authenticate a user''s subscribable ICS calendar feed (no login session). Regenerating it revokes existing subscription URLs.';

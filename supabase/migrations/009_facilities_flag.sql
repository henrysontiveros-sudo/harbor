-- 009_facilities_flag.sql
-- Adds a per-user "facilities" flag so the Setup Sheet page can be gated to
-- Facilities team members (in addition to admins / super admins).

alter table public.profiles
  add column if not exists facilities boolean not null default false;

comment on column public.profiles.facilities is
  'When true, this user can access the Setup Sheet run-sheet page even if they are not an admin.';

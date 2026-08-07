-- 014_security_log.sql
-- Hidden security/audit trail for 404s and unauthorized access attempts.
-- Distinct from audit_log (which records known-actor admin actions). This table
-- captures anonymous/probe traffic: dead-link 404s, unauthenticated hits on
-- protected routes, and non-org (wrong-domain) sign-ins that get bounced.
-- All writes are service-role (bypasses RLS). Only super_admins may read.

create table if not exists public.security_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,                 -- 'not_found' | 'unauthorized' | 'forbidden_domain'
  path text,                          -- the attempted path
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  ip text,
  user_agent text,
  detail jsonb
);

create index if not exists security_log_created_idx on public.security_log (created_at desc);
create index if not exists security_log_kind_idx on public.security_log (kind);

alter table public.security_log enable row level security;

-- Only super_admins can read; there is NO insert policy — every write goes
-- through the service-role client, which bypasses RLS.
drop policy if exists "super admins read security_log" on public.security_log;
create policy "super admins read security_log" on public.security_log
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

-- Harbor Migration 006: viewer role (view-only default) + role-change security + audit log
-- Apply in two parts: enum value must be committed before use.

-- ============ PART 1 (run first, separately) ============
alter type user_role add value if not exists 'viewer' before 'staff';

-- ============ PART 2 (run after part 1 commits) ============

-- New users default to view-only
alter table profiles alter column role set default 'viewer';

-- Helper: may this user create events / submit space requests?
create or replace function can_request() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('staff','admin','super_admin')
  );
$$;

-- Tighten creation policies: viewers cannot create events or requests
drop policy if exists "create events" on events;
create policy "create events" on events for insert to authenticated
  with check (created_by = auth.uid() and can_request());

drop policy if exists "insert requests" on space_requests;
create policy "insert requests" on space_requests for insert to authenticated
  with check (can_edit_event(event_id) and requested_by = auth.uid() and can_request());

-- Security: prevent self role escalation. Only super_admins (or the service
-- role backend, where auth.uid() is null) may change a profile's role.
create or replace function guard_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'
    ) then
      raise exception 'Only super admins can change user roles';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_role_change on profiles;
create trigger trg_guard_role_change before update on profiles
  for each row execute function guard_role_change();

-- Audit log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on audit_log(created_at desc);
alter table audit_log enable row level security;
drop policy if exists "admins read audit" on audit_log;
create policy "admins read audit" on audit_log for select to authenticated using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
);

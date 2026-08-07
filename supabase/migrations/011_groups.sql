-- 011_groups.sql
-- Groups = ministries (High School, Youth, Production, ...). Staff are assigned
-- to one or more groups on their INDIVIDUAL account, and may only create
-- bookings (events) for a group they belong to. This prevents someone from
-- logging in under a shared department email to submit requests — every booking
-- ties to an individual who has been granted that ministry.
--
-- No calendar coloring is derived from groups: this is purely a booking-control
-- layer. For display continuity, the New Event form still writes the group's
-- name into events.ministry, so the calendar / digest / setup sheet / approvals
-- keep rendering exactly as before.

-- ── Tables ────────────────────────────────────────────────
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  active      boolean not null default true,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

comment on table public.groups is
  'Ministries/teams a staff member can be assigned to. Gates which ministry a person may book for.';

create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  added_by  uuid references public.profiles(id) on delete set null,
  added_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

comment on table public.group_members is
  'Which individual accounts belong to which groups. One account may belong to many groups.';

-- Link a booking to the ministry/group it is for (nullable: legacy events + admin bookings).
alter table public.events
  add column if not exists group_id uuid references public.groups(id) on delete set null;

create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_events_group on public.events(group_id);

-- ── Authorization helpers ─────────────────────────────────
-- True if the current user may book for the given group: admins/super_admins
-- always; everyone else only if they are a member of that group.
create or replace function public.can_book_for_group(p_group uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
    or exists (
      select 1 from group_members gm
      where gm.group_id = p_group and gm.user_id = auth.uid()
    );
$function$;

-- True if the current user belongs to at least one active group (or is an admin).
create or replace function public.has_any_group()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
    or exists (
      select 1 from group_members gm
      join groups g on g.id = gm.group_id and g.active
      where gm.user_id = auth.uid()
    );
$function$;

-- ── Enforce group membership at event creation (RLS) ──────
-- Replaces the old "create events" insert policy. Still requires can_request()
-- (staff+). Additionally: if a group_id is supplied, the creator must be allowed
-- to book for it. A null group_id is only permitted for admins/super_admins
-- (e.g. system/admin bookings) — regular staff MUST pick one of their groups.
drop policy if exists "create events" on public.events;
create policy "create events" on public.events
  for insert
  with check (
    created_by = auth.uid()
    and can_request()
    and (
      -- admins/super_admins: unrestricted (any group, or none)
      exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('admin','super_admin')
      )
      -- staff: must supply a group they belong to
      or (group_id is not null and can_book_for_group(group_id))
    )
  );

-- ── RLS on the new tables ─────────────────────────────────
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Everyone signed in can READ groups + memberships (needed to populate the
-- booking dropdown and show assignments). Writes go through service-role API
-- routes only, so no insert/update/delete policies are defined here.
drop policy if exists "read groups" on public.groups;
create policy "read groups" on public.groups
  for select using (true);

drop policy if exists "read group_members" on public.group_members;
create policy "read group_members" on public.group_members
  for select using (true);

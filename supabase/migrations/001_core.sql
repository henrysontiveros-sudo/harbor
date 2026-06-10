-- Harbor: Mariners Church space request & event management
-- Migration 001: core schema

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────
create type user_role as enum ('staff', 'admin', 'super_admin');
create type request_status as enum ('draft', 'pending', 'approved', 'denied', 'cancelled');
create type request_scope as enum ('whole_event', 'occurrence');
create type event_status as enum ('active', 'cancelled');

-- ── Profiles ─────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role user_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- ── Campuses / Buildings / Spaces ────────────────────────
create table campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  active boolean not null default true
);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references campuses(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table spaces (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references campuses(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  name text not null,
  capacity int,
  amenities text[] not null default '{}',
  description text,
  requires_approval boolean not null default true,
  active boolean not null default true,
  sort_order int not null default 0
);
create index spaces_campus_idx on spaces(campus_id);

-- Per-campus admin assignment
create table campus_admins (
  campus_id uuid not null references campuses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (campus_id, user_id)
);

-- ── Events ───────────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  ministry text,
  campus_id uuid not null references campuses(id),
  created_by uuid not null references profiles(id),
  status event_status not null default 'active',
  -- recurrence: null = one-time; otherwise RRULE string (e.g. FREQ=WEEKLY;BYDAY=TU)
  rrule text,
  -- canonical first occurrence times (local wall time stored as timestamptz America/Los_Angeles)
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recurrence_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_campus_idx on events(campus_id);
create index events_created_by_idx on events(created_by);

-- Materialized occurrences (generated at create/edit time, capped horizon)
create table event_occurrences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cancelled boolean not null default false
);
create index occ_event_idx on event_occurrences(event_id);
create index occ_time_idx on event_occurrences(starts_at, ends_at);

create table event_editors (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  added_by uuid references profiles(id),
  primary key (event_id, user_id)
);

-- ── Space Requests ───────────────────────────────────────
create table space_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  space_id uuid not null references spaces(id),
  scope request_scope not null default 'whole_event',
  occurrence_id uuid references event_occurrences(id) on delete cascade,
  status request_status not null default 'pending',
  -- setup
  tables_qty int not null default 0,
  chairs_qty int not null default 0,
  setup_style text,            -- e.g. Rounds, Classroom, Theater, U-Shape, As-Is
  setup_notes text,            -- written details re: chair placement etc.
  -- tech & catering
  tech_needed boolean not null default false,
  tech_details text,
  catering_needed boolean not null default false,
  catering_details text,
  -- approval
  requested_by uuid not null references profiles(id),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  denial_reason text,
  created_at timestamptz not null default now(),
  constraint occurrence_scope_chk check (
    (scope = 'whole_event' and occurrence_id is null) or
    (scope = 'occurrence' and occurrence_id is not null)
  )
);
create index sr_event_idx on space_requests(event_id);
create index sr_space_idx on space_requests(space_id);
create index sr_status_idx on space_requests(status);

-- ── updated_at trigger ───────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger events_updated before update on events
  for each row execute function set_updated_at();

-- ── Auto-create profile on signup ────────────────────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Helper: is admin for campus ──────────────────────────
create or replace function is_campus_admin(p_campus uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  ) or exists (
    select 1 from campus_admins ca
    where ca.user_id = auth.uid() and ca.campus_id = p_campus
  ) or exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
      and exists (select 1 from campus_admins ca2 where ca2.user_id = p.id and ca2.campus_id = p_campus)
  );
$$;

create or replace function can_edit_event(p_event uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from events e where e.id = p_event and e.created_by = auth.uid()
  ) or exists (
    select 1 from event_editors ee where ee.event_id = p_event and ee.user_id = auth.uid()
  ) or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;

-- ── RLS ──────────────────────────────────────────────────
alter table profiles enable row level security;
alter table campuses enable row level security;
alter table buildings enable row level security;
alter table spaces enable row level security;
alter table campus_admins enable row level security;
alter table events enable row level security;
alter table event_occurrences enable row level security;
alter table event_editors enable row level security;
alter table space_requests enable row level security;

-- All authenticated staff can read everything
create policy "read profiles" on profiles for select to authenticated using (true);
create policy "read campuses" on campuses for select to authenticated using (true);
create policy "read buildings" on buildings for select to authenticated using (true);
create policy "read spaces" on spaces for select to authenticated using (true);
create policy "read campus_admins" on campus_admins for select to authenticated using (true);
create policy "read events" on events for select to authenticated using (true);
create policy "read occurrences" on event_occurrences for select to authenticated using (true);
create policy "read editors" on event_editors for select to authenticated using (true);
create policy "read requests" on space_requests for select to authenticated using (true);

-- Profiles: self-update (not role)
create policy "update own profile" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Events
create policy "create events" on events for insert to authenticated
  with check (created_by = auth.uid());
create policy "edit events" on events for update to authenticated
  using (can_edit_event(id));
create policy "delete events" on events for delete to authenticated
  using (created_by = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- Occurrences: editors manage
create policy "insert occurrences" on event_occurrences for insert to authenticated
  with check (can_edit_event(event_id));
create policy "update occurrences" on event_occurrences for update to authenticated
  using (can_edit_event(event_id));
create policy "delete occurrences" on event_occurrences for delete to authenticated
  using (can_edit_event(event_id));

-- Editors: event editors can add/remove
create policy "insert editors" on event_editors for insert to authenticated
  with check (can_edit_event(event_id));
create policy "delete editors" on event_editors for delete to authenticated
  using (can_edit_event(event_id));

-- Space requests: editors create/cancel; campus admins decide
create policy "insert requests" on space_requests for insert to authenticated
  with check (can_edit_event(event_id) and requested_by = auth.uid());
create policy "update requests" on space_requests for update to authenticated
  using (
    can_edit_event(event_id)
    or is_campus_admin((select s.campus_id from spaces s where s.id = space_id))
  );
create policy "delete requests" on space_requests for delete to authenticated
  using (can_edit_event(event_id));

-- Admin writes on campuses/buildings/spaces/campus_admins (super_admin only via service or role)
create policy "admin campuses" on campuses for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));
create policy "admin buildings" on buildings for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));
create policy "admin spaces" on spaces for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));
create policy "admin campus_admins" on campus_admins for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- ── Conflict check RPC ───────────────────────────────────
-- Returns conflicting occurrences for a proposed set of times on a space.
create or replace function check_space_conflicts(
  p_space uuid,
  p_times jsonb,                 -- [{"starts_at": "...", "ends_at": "..."}]
  p_exclude_event uuid default null
) returns table (
  conflict_starts_at timestamptz,
  conflict_ends_at timestamptz,
  event_title text,
  event_id uuid,
  request_status request_status
)
language sql stable security definer set search_path = public as $$
  with proposed as (
    select (t->>'starts_at')::timestamptz as s, (t->>'ends_at')::timestamptz as e
    from jsonb_array_elements(p_times) t
  )
  select o.starts_at, o.ends_at, ev.title, ev.id, sr.status
  from space_requests sr
  join events ev on ev.id = sr.event_id and ev.status = 'active'
  join event_occurrences o on o.event_id = sr.event_id and not o.cancelled
    and (sr.scope = 'whole_event' or sr.occurrence_id = o.id)
  join proposed p on (o.starts_at, o.ends_at) overlaps (p.s, p.e)
  where sr.space_id = p_space
    and sr.status in ('pending','approved')
    and (p_exclude_event is null or sr.event_id <> p_exclude_event)
  order by o.starts_at;
$$;

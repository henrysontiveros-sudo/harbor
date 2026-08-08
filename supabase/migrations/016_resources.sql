-- 016_resources.sql
-- Bookable RESOURCES (vehicles + equipment) that attach to an event, mirroring
-- the space_requests model. Vehicles are fleet-wide (campus_id null); equipment
-- belongs to a congregation and has a finite qty_on_hand. A request books a
-- quantity of a resource for the whole event or a single occurrence, goes pending,
-- and is approved/denied by the relevant campus admin (super_admins see all).

do $$ begin
  create type resource_category as enum ('vehicle', 'equipment');
exception when duplicate_object then null;
end $$;

create table if not exists public.resources (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  category          resource_category not null,
  campus_id         uuid references public.campuses(id) on delete cascade,  -- null = fleet-wide (vehicles)
  qty_on_hand       int,                 -- null = not quantity-tracked (vehicles: implicitly 1)
  requires_approval boolean not null default true,
  is_public         boolean not null default true,
  is_billable       boolean not null default false,
  active            boolean not null default true,
  sort_order        int not null default 100
);
create index if not exists resources_campus_idx on public.resources(campus_id);
create index if not exists resources_category_idx on public.resources(category);

create table if not exists public.resource_requests (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  resource_id   uuid not null references public.resources(id),
  scope         request_scope not null default 'whole_event',
  occurrence_id uuid references public.event_occurrences(id) on delete cascade,
  status        request_status not null default 'pending',
  quantity      int not null default 1,
  notes         text,
  requested_by  uuid not null references public.profiles(id),
  decided_by    uuid references public.profiles(id),
  decided_at    timestamptz,
  denial_reason text,
  created_at    timestamptz not null default now(),
  constraint rr_occurrence_scope_chk check (
    (scope = 'whole_event' and occurrence_id is null) or
    (scope = 'occurrence' and occurrence_id is not null)
  ),
  constraint rr_qty_pos check (quantity >= 1)
);
create index if not exists rr_event_idx on public.resource_requests(event_id);
create index if not exists rr_resource_idx on public.resource_requests(resource_id);
create index if not exists rr_status_idx on public.resource_requests(status);

-- ── RLS ──────────────────────────────────────────────────
alter table public.resources enable row level security;
alter table public.resource_requests enable row level security;

-- Everyone signed in can read the catalog + requests
drop policy if exists "read resources" on public.resources;
create policy "read resources" on public.resources for select to authenticated using (true);
drop policy if exists "read resource_requests" on public.resource_requests;
create policy "read resource_requests" on public.resource_requests for select to authenticated using (true);

-- Super admins manage the resource catalog (service-role bypasses RLS anyway)
drop policy if exists "admin resources" on public.resources;
create policy "admin resources" on public.resources for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- Event editors create/cancel their resource requests; campus admins decide.
-- Routing campus = the resource's campus if set, else the event's campus (vehicles).
drop policy if exists "insert resource_requests" on public.resource_requests;
create policy "insert resource_requests" on public.resource_requests for insert to authenticated
  with check (can_edit_event(event_id) and requested_by = auth.uid());
drop policy if exists "update resource_requests" on public.resource_requests;
create policy "update resource_requests" on public.resource_requests for update to authenticated
  using (
    can_edit_event(event_id)
    or is_campus_admin(coalesce(
         (select r.campus_id from resources r where r.id = resource_id),
         (select e.campus_id from events e where e.id = event_id)
       ))
  );
drop policy if exists "delete resource_requests" on public.resource_requests;
create policy "delete resource_requests" on public.resource_requests for delete to authenticated
  using (can_edit_event(event_id));

-- ── Availability RPC ─────────────────────────────────────
-- Returns the quantity already committed (pending+approved) for a resource in
-- any window overlapping the proposed times, so the UI can show remaining stock.
-- For vehicles (qty_on_hand null) treat capacity as 1.
create or replace function check_resource_availability(
  p_resource uuid,
  p_times jsonb,                 -- [{"starts_at":"...","ends_at":"..."}]
  p_exclude_event uuid default null
) returns table (
  committed_qty int,
  peak_starts_at timestamptz,
  peak_ends_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with proposed as (
    select (t->>'starts_at')::timestamptz as s, (t->>'ends_at')::timestamptz as e
    from jsonb_array_elements(p_times) t
  ),
  ov as (
    select o.starts_at, o.ends_at, rr.quantity
    from resource_requests rr
    join events ev on ev.id = rr.event_id and ev.status = 'active'
    join event_occurrences o on o.event_id = rr.event_id and not o.cancelled
      and (rr.scope = 'whole_event' or rr.occurrence_id = o.id)
    join proposed p on (o.starts_at, o.ends_at) overlaps (p.s, p.e)
    where rr.resource_id = p_resource
      and rr.status in ('pending','approved')
      and (p_exclude_event is null or rr.event_id <> p_exclude_event)
  )
  select coalesce(sum(quantity),0)::int as committed_qty,
         min(starts_at) as peak_starts_at,
         max(ends_at) as peak_ends_at
  from ov;
$$;

-- 017_services.sql
-- Bookable SERVICES: team-fulfilled requests that attach to an event (Childcare,
-- Safety, Production, Catering, Vehicle Use Policy Form). Unlike resources there
-- is no quantity or availability contention — a service request is a routed ASK
-- that the relevant congregation admin/team approves or denies. Each congregation
-- offers its own subset of service types (services catalog rows).

create table if not exists public.services (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,           -- e.g. 'Childcare Request'
  campus_id         uuid references public.campuses(id) on delete cascade,  -- congregation offering it
  requires_approval boolean not null default true,
  is_public         boolean not null default true,
  active            boolean not null default true,
  sort_order        int not null default 100,
  unique (campus_id, name)
);
create index if not exists services_campus_idx on public.services(campus_id);

create table if not exists public.service_requests (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  service_id    uuid not null references public.services(id),
  scope         request_scope not null default 'whole_event',
  occurrence_id uuid references public.event_occurrences(id) on delete cascade,
  status        request_status not null default 'pending',
  details       text,
  requested_by  uuid not null references public.profiles(id),
  decided_by    uuid references public.profiles(id),
  decided_at    timestamptz,
  denial_reason text,
  created_at    timestamptz not null default now(),
  constraint svcr_occurrence_scope_chk check (
    (scope = 'whole_event' and occurrence_id is null) or
    (scope = 'occurrence' and occurrence_id is not null)
  )
);
create index if not exists svcr_event_idx on public.service_requests(event_id);
create index if not exists svcr_service_idx on public.service_requests(service_id);
create index if not exists svcr_status_idx on public.service_requests(status);

-- ── RLS ──────────────────────────────────────────────────
alter table public.services enable row level security;
alter table public.service_requests enable row level security;

drop policy if exists "read services" on public.services;
create policy "read services" on public.services for select to authenticated using (true);
drop policy if exists "read service_requests" on public.service_requests;
create policy "read service_requests" on public.service_requests for select to authenticated using (true);

drop policy if exists "admin services" on public.services;
create policy "admin services" on public.services for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- Event editors create/cancel; the service's congregation admin decides.
drop policy if exists "insert service_requests" on public.service_requests;
create policy "insert service_requests" on public.service_requests for insert to authenticated
  with check (can_edit_event(event_id) and requested_by = auth.uid());
drop policy if exists "update service_requests" on public.service_requests;
create policy "update service_requests" on public.service_requests for update to authenticated
  using (
    can_edit_event(event_id)
    or is_campus_admin(coalesce(
         (select s.campus_id from services s where s.id = service_id),
         (select e.campus_id from events e where e.id = event_id)
       ))
  );
drop policy if exists "delete service_requests" on public.service_requests;
create policy "delete service_requests" on public.service_requests for delete to authenticated
  using (can_edit_event(event_id));

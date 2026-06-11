-- Harbor Migration 007: 48-hour lead-time restriction + admin bypass codes
--
-- Space requests for an occurrence that starts less than 48 hours away are
-- blocked, UNLESS the request carries admin_override = true (set only by the
-- service-role bypass endpoint after validating a bypass code).
--
-- A bypass code is an admin "on-call" override: it auto-approves a request
-- regardless of space, time, or conflicts. Every use is logged and the issuer
-- is emailed.

-- ── Columns on space_requests ────────────────────────────
alter table space_requests
  add column if not exists admin_override boolean not null default false,
  add column if not exists bypass_code_id uuid;

-- ── Bypass codes ─────────────────────────────────────────
create table if not exists bypass_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,                         -- what / who it's for
  issued_by uuid references profiles(id) on delete set null,
  issued_by_email text,
  max_uses int,                       -- null = unlimited
  use_count int not null default 0,
  expires_at timestamptz,             -- null = never
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists bypass_codes_active_idx on bypass_codes(active);

alter table space_requests
  add constraint space_requests_bypass_code_fk
  foreign key (bypass_code_id) references bypass_codes(id) on delete set null;

-- ── Bypass code usage log (the "second half" of the page) ─
create table if not exists bypass_code_uses (
  id uuid primary key default gen_random_uuid(),
  code_id uuid references bypass_codes(id) on delete set null,
  code_text text not null,
  used_by uuid references profiles(id) on delete set null,
  used_by_email text,
  request_id uuid references space_requests(id) on delete set null,
  detail jsonb,                       -- { event_title, space_name, campus, when }
  created_at timestamptz not null default now()
);
create index if not exists bypass_uses_code_idx on bypass_code_uses(code_id);
create index if not exists bypass_uses_created_idx on bypass_code_uses(created_at desc);

-- ── 48h lead-time enforcement trigger ────────────────────
-- Raised on any pending/approved request whose applicable occurrence starts
-- within 48 hours, unless admin_override is set.
create or replace function enforce_lead_time() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  min_start timestamptz;
  cutoff timestamptz := now() + interval '48 hours';
begin
  if new.admin_override then
    return new;
  end if;
  if new.status not in ('pending','approved') then
    return new;
  end if;

  if new.scope = 'occurrence' and new.occurrence_id is not null then
    select o.starts_at into min_start
    from event_occurrences o where o.id = new.occurrence_id;
  else
    select min(o.starts_at) into min_start
    from event_occurrences o
    where o.event_id = new.event_id and not o.cancelled;
  end if;

  if min_start is not null and min_start < cutoff then
    raise exception 'LEAD_TIME_48H: This booking is within 48 hours. An admin bypass code is required.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_lead_time on space_requests;
create trigger trg_enforce_lead_time
  before insert or update on space_requests
  for each row execute function enforce_lead_time();

-- ── RLS ──────────────────────────────────────────────────
alter table bypass_codes enable row level security;
alter table bypass_code_uses enable row level security;

-- Admins & super admins can read/manage codes
drop policy if exists "admins read bypass codes" on bypass_codes;
create policy "admins read bypass codes" on bypass_codes for select to authenticated using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
);
drop policy if exists "admins manage bypass codes" on bypass_codes;
create policy "admins manage bypass codes" on bypass_codes for all to authenticated using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
);

-- Admins & super admins can read the usage log (inserts happen via service role)
drop policy if exists "admins read bypass uses" on bypass_code_uses;
create policy "admins read bypass uses" on bypass_code_uses for select to authenticated using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
);

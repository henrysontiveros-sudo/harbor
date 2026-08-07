-- 010_preassigned_users.sql
-- Pre-provision people BEFORE their first sign-in.
--
-- Harbor auth is Google-only, and a profile row can't exist until a person's
-- first login (the id comes from auth.users). This table lets admins stage a
-- person's role + facilities access ahead of time, keyed by email. When they
-- first sign in, handle_new_user() looks up their email here and applies the
-- staged settings automatically — no scramble to set permissions at sign-in.

create table if not exists public.preassigned_users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  role            public.user_role not null default 'viewer',
  facilities      boolean not null default false,
  note            text,
  invited_by      uuid references public.profiles(id) on delete set null,
  invited_email   text,
  created_at      timestamptz not null default now(),
  applied_at      timestamptz,                                   -- set when the person first signs in
  applied_user_id uuid references public.profiles(id) on delete set null
);

comment on table public.preassigned_users is
  'Staged role/facilities settings applied automatically at a user''s first sign-in, matched by email.';

-- All reads/writes go through service-role API routes (admin-gated in app code).
-- Enable RLS with no policies so the anon/authenticated roles cannot touch it.
alter table public.preassigned_users enable row level security;

-- Rewrite the new-user handler to apply any staged pre-assignment.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  pre public.preassigned_users%rowtype;
begin
  select * into pre
    from public.preassigned_users
    where lower(email) = lower(new.email)
    limit 1;

  insert into public.profiles (id, email, full_name, avatar_url, role, facilities)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(pre.role, 'viewer'::public.user_role),
    coalesce(pre.facilities, false)
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
    -- NOTE: role/facilities intentionally NOT overwritten on conflict — a
    -- pre-assignment only seeds a brand-new profile, never demotes/re-writes an
    -- existing one.

  if pre.id is not null then
    update public.preassigned_users
      set applied_at = now(), applied_user_id = new.id
      where id = pre.id;
  end if;

  return new;
end $function$;

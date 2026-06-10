-- Migration 005: feedback table
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('bug','suggestion','improvement','other')),
  title text not null,
  description text not null,
  submitted_by uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text,
  status text not null default 'open' check (status in ('open','reviewed','done','dismissed')),
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

create policy "authenticated can insert feedback" on feedback
  for insert to authenticated with check (submitted_by = auth.uid());

create policy "admins can read feedback" on feedback
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

create policy "admins can update feedback" on feedback
  for update to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

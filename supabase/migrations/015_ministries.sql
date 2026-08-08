-- 015_ministries.sql
-- Replace the seed/demo groups with the real Mariners ministry taxonomy from
-- Categories.xlsx. Ministries carry a brand-palette color (for calendar coloring
-- and the create-event picker), the eSPACE Is Public flag, the source eSPACE
-- Category Id, and an optional parent (for the nested Next Gen / Operations /
-- Discipleship / Courses groupings). Nesting is display-only — booking control is
-- still per-individual-ministry.

-- Extend groups with the metadata columns.
alter table public.groups
  add column if not exists color       text,
  add column if not exists is_public   boolean not null default true,
  add column if not exists external_id bigint,
  add column if not exists parent_id   uuid references public.groups(id) on delete set null;

create index if not exists idx_groups_parent on public.groups(parent_id);

-- external_id unique when present (eSPACE Category Id); allow multiple NULLs.
create unique index if not exists uq_groups_external_id on public.groups(external_id) where external_id is not null;

comment on column public.groups.color is 'Brand-palette calendar color (hex).';
comment on column public.groups.is_public is 'eSPACE Is Public flag.';
comment on column public.groups.external_id is 'Source eSPACE Category Id.';
comment on column public.groups.parent_id is 'Parent ministry for nested categories (display grouping only).';

-- Seed data (42 real ministries) is applied separately; the pre-existing demo
-- groups (Mariners Kids, Prayer Ministry, Student Ministries, Women's Ministry,
-- Worship) are removed and replaced.


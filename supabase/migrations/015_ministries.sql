-- 015_ministries.sql
-- Replace the seed/demo groups with the real Mariners ministry taxonomy from
-- Categories.xlsx. Ministries are a FLAT list (no parent/child nesting) used as a
-- booking-control layer (who may book for what). Each carries a brand-palette
-- color (for future calendar coloring), the eSPACE Is Public flag, and the source
-- eSPACE Category Id for traceability.

-- Extend groups with the metadata columns (flat — no parent_id).
alter table public.groups
  add column if not exists color       text,
  add column if not exists is_public   boolean not null default true,
  add column if not exists external_id bigint;

-- Clean up the nesting column if an earlier revision added it.
alter table public.groups drop column if exists parent_id;

-- external_id unique when present (eSPACE Category Id); allow multiple NULLs.
create unique index if not exists uq_groups_external_id on public.groups(external_id) where external_id is not null;

comment on column public.groups.color is 'Brand-palette calendar color (hex).';
comment on column public.groups.is_public is 'eSPACE Is Public flag.';
comment on column public.groups.external_id is 'Source eSPACE Category Id.';

-- Seed data (42 real ministries) is applied separately; the pre-existing demo
-- groups (Mariners Kids, Prayer Ministry, Student Ministries, Women's Ministry,
-- Worship) are removed and replaced.

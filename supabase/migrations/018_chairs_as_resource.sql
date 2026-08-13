-- 018_chairs_as_resource.sql
-- Link a resource request back to the space request whose "chairs" field
-- created it. When someone enters chairs on the Request-a-Space form, Harbor
-- also files a matching chair resource request against the congregation's chair
-- inventory so Facilities availability stays accurate. This column lets us find
-- and keep that mirror in sync (update qty, or cancel when chairs are cleared).

alter table public.resource_requests
  add column if not exists linked_space_request_id uuid
  references public.space_requests(id) on delete set null;

comment on column public.resource_requests.linked_space_request_id is
  'When set, this resource request was auto-created from a space request''s chairs field and mirrors it.';

-- Migration 003: bootstrap super admins
create or replace function promote_bootstrap_admins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) in (
    'hontiveros@marinerschurch.org',
    'henry@inov8-socal.tech',
    'henry+agent@inov8-socal.tech'
  ) then
    update public.profiles set role = 'super_admin' where id = new.id;
  end if;
  return new;
end $$;

create trigger bootstrap_admins
  after insert on public.profiles
  for each row execute function promote_bootstrap_admins();

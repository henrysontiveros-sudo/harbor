-- Harbor Migration 008: allow super_admins to write audit_log entries directly.
--
-- Campus-admin assignment/removal is done client-side (super_admin-gated by the
-- "admin campus_admins" RLS policy). To record those actions in audit_log
-- without moving the write to a service-role route, super_admins need INSERT
-- rights on audit_log. Reads remain admin/super_admin only (migration 006).

drop policy if exists "super_admin insert audit" on audit_log;
create policy "super_admin insert audit" on audit_log for insert to authenticated
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super_admin')
    and actor_id = auth.uid()
  );

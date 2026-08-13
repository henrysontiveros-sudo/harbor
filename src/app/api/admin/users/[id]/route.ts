import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProtectedEmail } from "@/lib/protected-accounts";

/**
 * Remove a person from Harbor entirely.
 *
 * Deletes the underlying auth user, which cascades to their profile,
 * congregation-admin assignments, event-editor rows, and group memberships.
 * Authored events and space/resource/service requests use ON DELETE NO ACTION,
 * so if the person created any of those the DB blocks the delete — we pre-check
 * and return a clear message instead of a raw FK error.
 *
 * Also clears any pending pre-assignment for their email so a removed person
 * can't silently return with a staged role on their next sign-in.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only super_admins may remove people
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Can't remove yourself
  if (id === user.id) {
    return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles").select("id, email, full_name, role").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Guard protected accounts
  if (isProtectedEmail(target.email)) {
    return NextResponse.json({ error: "This account is protected and cannot be removed." }, { status: 403 });
  }

  // Pre-check dependencies that would block the delete (NO ACTION FKs).
  const [events, spaceReqs, resourceReqs, serviceReqs, editors] = await Promise.all([
    admin.from("events").select("id", { count: "exact", head: true }).eq("created_by", id),
    admin.from("space_requests").select("id", { count: "exact", head: true }).or(`requested_by.eq.${id},decided_by.eq.${id}`),
    admin.from("resource_requests").select("id", { count: "exact", head: true }).or(`requested_by.eq.${id},decided_by.eq.${id}`),
    admin.from("service_requests").select("id", { count: "exact", head: true }).or(`requested_by.eq.${id},decided_by.eq.${id}`),
    admin.from("event_editors").select("event_id", { count: "exact", head: true }).eq("added_by", id),
  ]);

  const blockers: string[] = [];
  if ((events.count ?? 0) > 0) blockers.push(`${events.count} event(s) they created`);
  const reqCount = (spaceReqs.count ?? 0) + (resourceReqs.count ?? 0) + (serviceReqs.count ?? 0);
  if (reqCount > 0) blockers.push(`${reqCount} request(s) they submitted or decided`);
  if ((editors.count ?? 0) > 0) blockers.push(`${editors.count} event(s) they were added to as an editor by`);

  if (blockers.length > 0) {
    return NextResponse.json(
      {
        error:
          `Can't remove ${target.full_name ?? target.email} yet — they have ${blockers.join(", ")}. ` +
          `Reassign or delete those first, or set them to Viewer to lock them out.`,
      },
      { status: 409 }
    );
  }

  // Clear any staged pre-assignment for this email (case-insensitive).
  await admin.from("preassigned_users").delete().ilike("email", target.email);

  // Delete the auth user — cascades to profile, campus_admins, event_editors, group_members.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit (best-effort)
  await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "user_remove",
    target_type: "profile",
    target_id: id,
    detail: { email: target.email, full_name: target.full_name, role: target.role },
  });

  return NextResponse.json({ success: true });
}

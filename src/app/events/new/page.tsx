import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { canRequest, type UserRole } from "@/lib/types";
import NewEventForm from "./NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  const role = profile?.role as UserRole | undefined;
  if (!canRequest(role)) redirect("/");

  const isAdmin = role === "admin" || role === "super_admin";

  const { data: campuses } = await supabase
    .from("campuses")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");

  // Groups the person may book for. Admins/super admins: all active groups.
  // Staff: only the active groups they're assigned to.
  // parent_id + color are carried so the picker can nest and color-swatch them.
  let groups: { id: string; name: string; color: string | null; parent_id: string | null }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("groups").select("id, name, color, parent_id").eq("active", true).order("sort_order").order("name");
    groups = data ?? [];
  } else {
    const { data } = await supabase
      .from("group_members")
      .select("groups!inner ( id, name, color, parent_id, active, sort_order )")
      .eq("user_id", user!.id);
    groups = (data ?? [])
      .map((r: any) => r.groups)
      .filter((g: any) => g && g.active)
      .sort((a: any, b: any) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name))
      .map((g: any) => ({ id: g.id, name: g.name, color: g.color ?? null, parent_id: g.parent_id ?? null }));
  }

  // Parent ministries (for display grouping in the picker). Fetched separately so
  // staff see the parent label even when they can't book for the parent itself.
  const { data: parentRows } = await supabase
    .from("groups").select("id, name").is("parent_id", null).eq("active", true).order("sort_order").order("name");
  const parents = parentRows ?? [];

  // Staff with no groups cannot book — show a clear empty state instead of the form.
  if (!isAdmin && groups.length === 0) {
    return (
      <>
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-black text-imperial mb-1">New Event</h1>
          <div className="card p-8 mt-4 text-center">
            <p className="font-semibold text-ink mb-2">You&apos;re not assigned to a group yet</p>
            <p className="text-sm text-ink/60 mb-4">
              Bookings are made on behalf of a ministry/group. Ask an administrator to add you to the
              group(s) you book for, then you&apos;ll be able to create events.
            </p>
            <Link href="/" className="btn-secondary px-4 py-2 text-sm">Back to schedule</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-imperial mb-1">New Event</h1>
        <p className="text-sm text-ink/50 mb-6">
          Step 1 of 2 — create the event, then add the spaces you need.
        </p>
        <NewEventForm campuses={campuses ?? []} groups={groups} parents={parents} isAdmin={isAdmin} />
      </main>
    </>
  );
}

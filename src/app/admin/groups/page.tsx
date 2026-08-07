import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import GroupsClient from "./GroupsClient";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/groups");

  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin" && me?.role !== "super_admin") redirect("/admin");

  const [{ data: groups }, { data: members }, { data: profiles }] = await Promise.all([
    supabase.from("groups").select("id, name, description, active, sort_order").order("sort_order").order("name"),
    supabase.from("group_members").select("group_id, user_id"),
    supabase.from("profiles").select("id, email, full_name, role").order("email"),
  ]);

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">Groups</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-1">Groups &amp; Ministries</h1>
        <p className="text-sm text-ink/50 mb-6">
          A group is a ministry. Staff can only book for the groups they&apos;re assigned to here —
          so a person signed in on their own account can request spaces only for the ministries you
          grant them. Admins and super admins can book for any ministry.
        </p>
        <GroupsClient
          groups={groups ?? []}
          members={members ?? []}
          profiles={profiles ?? []}
        />
      </main>
    </>
  );
}

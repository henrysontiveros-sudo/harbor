import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();

  if (me?.role !== "super_admin") redirect("/admin");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, facilities, created_at")
    .order("role")
    .order("email");

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">Users</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-1">Users &amp; Roles</h1>
        <p className="text-sm text-ink/50 mb-6">
          Everyone signs in as a Viewer by default. Promote people who need to request spaces or manage approvals.
        </p>
        <UsersClient profiles={profiles ?? []} currentUserId={user!.id} />
      </main>
    </>
  );
}

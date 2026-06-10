import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  const { data: adminRows } = await supabase
    .from("campus_admins").select("campus_id").eq("user_id", user!.id);

  const isSuper = profile?.role === "super_admin";
  if (!isSuper && (adminRows ?? []).length === 0) redirect("/");

  const [{ data: campuses }, { data: profiles }, { data: campusAdmins }] = await Promise.all([
    supabase.from("campuses").select("id, name, slug, active").order("sort_order"),
    supabase.from("profiles").select("id, email, full_name, role").order("email"),
    supabase.from("campus_admins").select("campus_id, user_id"),
  ]);

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-imperial mb-1">Admin</h1>
        <p className="text-sm text-ink/50 mb-6">
          {isSuper ? "Manage campus admins and staff roles." : "Your campus assignments."}
        </p>
        <AdminPanel
          campuses={campuses ?? []}
          profiles={profiles ?? []}
          campusAdmins={campusAdmins ?? []}
          isSuper={isSuper}
        />
      </main>
    </>
  );
}

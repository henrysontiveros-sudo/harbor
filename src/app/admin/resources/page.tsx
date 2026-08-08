import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ResourcesClient from "./ResourcesClient";

export const dynamic = "force-dynamic";

export default async function ResourcesAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/resources");

  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "super_admin") redirect("/admin");

  const [{ data: resources }, { data: campuses }] = await Promise.all([
    supabase.from("resources").select("id, name, category, campus_id, qty_on_hand, is_billable, is_public, requires_approval, active, sort_order").order("category").order("sort_order").order("name"),
    supabase.from("campuses").select("id, name, slug, sort_order").eq("active", true).order("sort_order"),
  ]);

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">Resources</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-1">Resources</h1>
        <p className="text-sm text-ink/50 mb-6">
          Bookable vehicles and equipment. Vehicles are shared across all congregations;
          equipment belongs to one congregation and tracks a quantity on hand. Staff request
          these on an event and the relevant congregation admin approves them.
        </p>
        <ResourcesClient
          resources={resources ?? []}
          campuses={campuses ?? []}
        />
      </main>
    </>
  );
}

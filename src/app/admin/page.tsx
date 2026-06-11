import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="card px-4 py-3 h-full">
      <p className="text-2xl font-black text-imperial">{value}</p>
      <p className="text-xs text-ink/50 mt-0.5">{label}</p>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-80 transition-opacity">{inner}</Link> : inner;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  const { data: adminRows } = await supabase
    .from("campus_admins").select("campus_id").eq("user_id", user!.id);

  const isSuper = profile?.role === "super_admin";
  if (!isSuper && (adminRows ?? []).length === 0) redirect("/");

  const [
    { data: campuses },
    { data: profiles },
    { data: campusAdmins },
    { count: pendingCount },
    { count: eventCount },
    { count: openFeedback },
  ] = await Promise.all([
    supabase.from("campuses").select("id, name, slug, active").order("sort_order"),
    supabase.from("profiles").select("id, email, full_name, role").order("email"),
    supabase.from("campus_admins").select("campus_id, user_id"),
    supabase.from("space_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("feedback").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const roleCounts = (profiles ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-imperial mb-1">Admin</h1>
        <p className="text-sm text-ink/50 mb-6">
          {isSuper ? "System overview and management." : "Your campus assignments."}
        </p>

        {/* Stat grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Pending approvals" value={pendingCount ?? 0} href="/approvals" />
          <StatCard label="Active events" value={eventCount ?? 0} href="/events" />
          {isSuper && <StatCard label="Users" value={profiles?.length ?? 0} href="/admin/users" />}
          {isSuper && <StatCard label="Open feedback" value={openFeedback ?? 0} href="/admin/feedback" />}
        </div>

        {/* Management links */}
        {isSuper && (
          <div className="grid sm:grid-cols-3 gap-3 mb-8">
            <Link href="/admin/users" className="card p-4 hover:border-imperial/30 transition-colors">
              <h3 className="font-bold text-imperial">Users &amp; Roles</h3>
              <p className="text-xs text-ink/50 mt-1">
                {roleCounts.viewer ?? 0} viewers · {(roleCounts.staff ?? 0)} staff · {(roleCounts.admin ?? 0) + (roleCounts.super_admin ?? 0)} admins
              </p>
            </Link>
            <Link href="/admin/feedback" className="card p-4 hover:border-imperial/30 transition-colors">
              <h3 className="font-bold text-imperial">Feedback</h3>
              <p className="text-xs text-ink/50 mt-1">Review bug reports &amp; suggestions</p>
            </Link>
            <Link href="/admin/activity" className="card p-4 hover:border-imperial/30 transition-colors">
              <h3 className="font-bold text-imperial">Activity Log</h3>
              <p className="text-xs text-ink/50 mt-1">Role changes &amp; admin actions</p>
            </Link>
          </div>
        )}

        {/* Campus admins management (existing) */}
        <h2 className="text-lg font-bold text-imperial mb-3">Campus Admins</h2>
        <AdminPanel
          campuses={campuses ?? []}
          profiles={profiles ?? []}
          campusAdmins={campusAdmins ?? []}
          isSuper={isSuper}
        />

        {isSuper && (
          <div className="mt-8 text-right">
            <Link href="/admin/system" className="text-xs text-ink/30 hover:text-ink/50 transition-colors">
              System &amp; diagnostics →
            </Link>
          </div>
        )}
      </main>
    </>
  );
}

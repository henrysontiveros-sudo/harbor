import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ApprovalsList from "./ApprovalsList";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  const { data: adminRows } = await supabase
    .from("campus_admins").select("campus_id").eq("user_id", user!.id);

  const isSuper = profile?.role === "super_admin";
  const adminCampusIds = (adminRows ?? []).map((r) => r.campus_id);

  if (!isSuper && adminCampusIds.length === 0) redirect("/");

  let query = supabase
    .from("space_requests")
    .select(`
      *,
      spaces!inner ( id, name, campus_id, buildings ( name ), campuses ( name ) ),
      events ( id, title, ministry, rrule, starts_at, ends_at ),
      profiles!space_requests_requested_by_fkey ( full_name, email )
    `)
    .eq("status", "pending")
    .order("created_at");

  if (!isSuper) {
    query = query.in("spaces.campus_id", adminCampusIds);
  }

  const { data: pending } = await query;

  // ── Pending RESOURCE requests ──
  // Routing campus = resource.campus_id (equipment) or the event's campus (vehicles).
  let rrQ = supabase
    .from("resource_requests")
    .select(`
      *,
      resources ( id, name, category, campus_id, is_billable ),
      events ( id, title, campus_id, ministry, rrule, starts_at, ends_at, campuses ( name ) ),
      profiles!resource_requests_requested_by_fkey ( full_name, email )
    `)
    .eq("status", "pending")
    .order("created_at");
  const { data: pendingResourcesAll } = await rrQ;
  const routeCampus = (r: any) => r.resources?.campus_id ?? r.events?.campus_id;
  const pendingResources = (pendingResourcesAll ?? []).filter(
    (r: any) => isSuper || adminCampusIds.includes(routeCampus(r))
  );

  // recent resource decisions
  const { data: recentResourcesAll } = await supabase
    .from("resource_requests")
    .select(`
      *,
      resources ( id, name, category, campus_id, is_billable ),
      events ( id, title, campus_id, starts_at, ends_at, rrule, campuses ( name ) ),
      profiles!resource_requests_requested_by_fkey ( full_name, email )
    `)
    .in("status", ["approved", "denied"])
    .order("decided_at", { ascending: false })
    .limit(15);
  const recentResources = (recentResourcesAll ?? []).filter(
    (r: any) => isSuper || adminCampusIds.includes(routeCampus(r))
  );

  // ── Pending SERVICE requests ──
  // Routing campus = service.campus_id (or the event's campus as a fallback).
  const { data: pendingServicesAll } = await supabase
    .from("service_requests")
    .select(`
      *,
      services ( id, name, campus_id ),
      events ( id, title, campus_id, ministry, rrule, starts_at, ends_at, campuses ( name ) ),
      profiles!service_requests_requested_by_fkey ( full_name, email )
    `)
    .eq("status", "pending")
    .order("created_at");
  const routeCampusSvc = (r: any) => r.services?.campus_id ?? r.events?.campus_id;
  const pendingServices = (pendingServicesAll ?? []).filter(
    (r: any) => isSuper || adminCampusIds.includes(routeCampusSvc(r))
  );

  const { data: recentServicesAll } = await supabase
    .from("service_requests")
    .select(`
      *,
      services ( id, name, campus_id ),
      events ( id, title, campus_id, starts_at, ends_at, rrule, campuses ( name ) ),
      profiles!service_requests_requested_by_fkey ( full_name, email )
    `)
    .in("status", ["approved", "denied"])
    .order("decided_at", { ascending: false })
    .limit(15);
  const recentServices = (recentServicesAll ?? []).filter(
    (r: any) => isSuper || adminCampusIds.includes(routeCampusSvc(r))
  );

  // recent decisions
  let recentQ = supabase
    .from("space_requests")
    .select(`
      *,
      spaces!inner ( id, name, campus_id, buildings ( name ), campuses ( name ) ),
      events ( id, title, starts_at, ends_at, rrule ),
      profiles!space_requests_requested_by_fkey ( full_name, email )
    `)
    .in("status", ["approved", "denied"])
    .order("decided_at", { ascending: false })
    .limit(15);
  if (!isSuper) recentQ = recentQ.in("spaces.campus_id", adminCampusIds);
  const { data: recent } = await recentQ;

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-imperial mb-1">Approvals</h1>
        <p className="text-sm text-ink/50 mb-6">
          Space and resource requests waiting on your decision.
        </p>
        <ApprovalsList
          pending={(pending ?? []) as any}
          recent={(recent ?? []) as any}
          pendingResources={pendingResources as any}
          recentResources={recentResources as any}
          pendingServices={pendingServices as any}
          recentServices={recentServices as any}
        />
      </main>
    </>
  );
}

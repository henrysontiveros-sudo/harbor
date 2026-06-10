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
          Space requests waiting on your decision.
        </p>
        <ApprovalsList pending={(pending ?? []) as any} recent={(recent ?? []) as any} />
      </main>
    </>
  );
}

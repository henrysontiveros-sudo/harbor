import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/feedback/[id]/resolve  { resolved: boolean }
// Marks a feedback item resolved (status='resolved', triaged_at stamped) or
// reopens it (status='open', triaged_at cleared). Admin / super_admin only.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin" && me?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const resolved = body?.resolved !== false; // default true

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("feedback").select("id, status").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update = resolved
    ? { status: "resolved", triaged_at: new Date().toISOString() }
    : { status: "open", triaged_at: null };

  const { error } = await admin.from("feedback").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: resolved ? "feedback_resolved" : "feedback_reopened",
    target_type: "feedback",
    target_id: id,
    detail: { from: target.status, to: update.status },
  });

  return NextResponse.json({ success: true, status: update.status });
}

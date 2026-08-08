import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Decide (approve/deny) a RESOURCE request. Mirrors the space-request decide
// route but without email (resource decisions don't email the requester yet —
// they show in-app). RLS enforces that only the routing campus admin (or a
// super_admin) can perform the update.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status, denial_reason } = await request.json();
  if (!["approved", "denied"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("resource_requests")
    .update({
      status,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      denial_reason: status === "denied" ? denial_reason?.trim() || null : null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) {
    return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

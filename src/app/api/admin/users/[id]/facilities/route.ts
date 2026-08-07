import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only super_admins may toggle the facilities flag
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { facilities } = await request.json();
  if (typeof facilities !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles").select("id, email, facilities").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.facilities === facilities) {
    return NextResponse.json({ success: true, unchanged: true });
  }

  const { error } = await admin.from("profiles").update({ facilities }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "facilities_change",
    target_type: "profile",
    target_id: id,
    detail: { email: target.email, facilities },
  });

  return NextResponse.json({ success: true });
}

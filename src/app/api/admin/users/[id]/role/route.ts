import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_ROLES = ["viewer", "staff", "admin", "super_admin"];

// Henry's accounts — cannot be demoted or locked out via the UI.
const PROTECTED_EMAILS = [
  "hontiveros@marinerschurch.org",
  "henrysontiveros@gmail.com",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Authorize: only super_admins may change roles
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { role } = await request.json();
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Load target
  const { data: target } = await admin
    .from("profiles").select("id, email, full_name, role").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Guard protected accounts from demotion
  if (PROTECTED_EMAILS.includes(target.email.toLowerCase()) && role !== "super_admin") {
    return NextResponse.json({ error: "This account is protected and cannot be changed." }, { status: 403 });
  }

  if (target.role === role) {
    return NextResponse.json({ success: true, unchanged: true });
  }

  const { error } = await admin.from("profiles").update({ role }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "role_change",
    target_type: "profile",
    target_id: id,
    detail: { email: target.email, from: target.role, to: role },
  });

  return NextResponse.json({ success: true });
}

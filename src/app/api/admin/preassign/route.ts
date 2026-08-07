import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

const ALLOWED_DOMAINS = ["marinerschurch.org", "inov8-socal.tech"];
const VALID_ROLES: UserRole[] = ["viewer", "staff", "admin", "super_admin"];

interface IncomingRow {
  email?: string;
  role?: string;
  facilities?: boolean | string;
  note?: string | null;
}

function normalizeFacilities(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

// POST: bulk upsert pre-assignments. Admin/super_admin only.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles").select("role, email").eq("id", user.id).single();
  const myRole = me?.role as UserRole | undefined;
  if (myRole !== "admin" && myRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json({ error: "Too many rows (max 1000 per upload)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const errors: { line: number; email: string; reason: string }[] = [];
  const clean: {
    email: string; role: UserRole; facilities: boolean; note: string | null;
    invited_by: string; invited_email: string | null;
  }[] = [];
  const seen = new Set<string>();

  rows.forEach((r, i) => {
    const line = i + 1;
    const email = String(r.email ?? "").trim().toLowerCase();
    if (!email) { errors.push({ line, email: "", reason: "Missing email" }); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push({ line, email, reason: "Invalid email format" }); return;
    }
    const domain = email.split("@")[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      errors.push({ line, email, reason: `Domain not allowed (must be ${ALLOWED_DOMAINS.join(" or ")})` });
      return;
    }
    if (seen.has(email)) {
      errors.push({ line, email, reason: "Duplicate email in file" }); return;
    }
    const role = (String(r.role ?? "viewer").trim().toLowerCase() || "viewer") as UserRole;
    if (!VALID_ROLES.includes(role)) {
      errors.push({ line, email, reason: `Invalid role "${r.role}" (use viewer, staff, admin, or super_admin)` });
      return;
    }
    // Only super_admins may pre-assign the super_admin role.
    if (role === "super_admin" && myRole !== "super_admin") {
      errors.push({ line, email, reason: "Only a super admin can pre-assign the super_admin role" });
      return;
    }
    seen.add(email);
    clean.push({
      email,
      role,
      facilities: normalizeFacilities(r.facilities),
      note: r.note ? String(r.note).trim().slice(0, 500) : null,
      invited_by: user.id,
      invited_email: me?.email ?? null,
    });
  });

  let upserted = 0;
  if (clean.length > 0) {
    const { error, count } = await admin
      .from("preassigned_users")
      .upsert(clean, { onConflict: "email", ignoreDuplicates: false, count: "exact" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    upserted = count ?? clean.length;

    await admin.from("audit_log").insert({
      actor_id: user.id,
      actor_email: user.email,
      action: "preassign_bulk_upload",
      target_type: "preassigned_users",
      target_id: null,
      detail: { count: clean.length, emails: clean.map((c) => c.email).slice(0, 50) },
    });
  }

  return NextResponse.json({
    success: true,
    upserted,
    skipped: errors.length,
    errors,
  });
}

// DELETE: remove one pre-assignment by id. Admin/super_admin only.
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin" && me?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("preassigned_users").select("email").eq("id", id).single();

  const { error } = await admin.from("preassigned_users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "preassign_delete",
    target_type: "preassigned_users",
    target_id: id,
    detail: { email: target?.email ?? null },
  });

  return NextResponse.json({ success: true });
}

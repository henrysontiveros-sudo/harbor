import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin / super-admin only. Issue, deactivate, or reactivate bypass codes.

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  const { data: me } = await supabase
    .from("profiles").select("role, full_name, email").eq("id", user.id).single();
  if (!me || !["admin", "super_admin"].includes(me.role)) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { user, me };
}

// Unambiguous alphabet (no 0/O/1/I) → human-readable, phone-friendly codes
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return `${pick(4)}-${pick(4)}`;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const label: string | null = body.label?.trim() || null;
  const maxUses: number | null =
    body.max_uses === null || body.max_uses === undefined || body.max_uses === ""
      ? null
      : Math.max(1, parseInt(String(body.max_uses)) || 1);
  const expiresAt: string | null = body.expires_at || null;

  const admin = createAdminClient();

  // Generate a unique code (retry on the rare collision)
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await admin
      .from("bypass_codes").select("id").eq("code", code).maybeSingle();
    if (!clash) break;
    code = genCode();
  }

  const { data, error } = await admin
    .from("bypass_codes")
    .insert({
      code,
      label,
      issued_by: auth.user.id,
      issued_by_email: auth.user.email,
      max_uses: maxUses,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    action: "bypass_code_issued",
    target_type: "bypass_code",
    target_id: data.id,
    detail: { code, label, max_uses: maxUses, expires_at: expiresAt },
  });

  return NextResponse.json({ success: true, code: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, active } = await request.json();
  if (!id || typeof active !== "boolean") {
    return NextResponse.json({ error: "id and active required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("bypass_codes").update({ active }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    action: active ? "bypass_code_reactivated" : "bypass_code_deactivated",
    target_type: "bypass_code",
    target_id: id,
  });

  return NextResponse.json({ success: true });
}

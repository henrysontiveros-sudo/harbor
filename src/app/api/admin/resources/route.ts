import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

async function requireSuper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  const role = me?.role as UserRole | undefined;
  if (role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, admin: createAdminClient() };
}

const CATEGORIES = ["vehicle", "equipment"];

// POST — actions: create_resource, update_resource
export async function POST(request: Request) {
  const gate = await requireSuper();
  if (gate.error) return gate.error;
  const { user, admin } = gate;

  const body = await request.json().catch(() => ({}));
  const action = body?.action as string;

  if (action === "create_resource") {
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim();
    if (!name) return NextResponse.json({ error: "Resource name is required" }, { status: 400 });
    if (!CATEGORIES.includes(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

    // Vehicles are fleet-wide (campus null, qty null); equipment needs a campus.
    const campus_id = category === "vehicle" ? null : (body.campus_id ? String(body.campus_id) : null);
    if (category === "equipment" && !campus_id) {
      return NextResponse.json({ error: "Equipment needs a congregation" }, { status: 400 });
    }
    const qty_on_hand = category === "vehicle"
      ? null
      : (body.qty_on_hand === null || body.qty_on_hand === undefined || body.qty_on_hand === ""
          ? null : Math.max(0, parseInt(String(body.qty_on_hand)) || 0));

    const { data, error } = await admin
      .from("resources")
      .insert({
        name, category, campus_id, qty_on_hand,
        is_billable: !!body.is_billable,
        is_public: body.is_public === undefined ? true : !!body.is_public,
        requires_approval: body.requires_approval === undefined ? true : !!body.requires_approval,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("audit_log").insert({
      actor_id: user.id, actor_email: user.email,
      action: "resource_create", target_type: "resource", target_id: data.id,
      detail: { name, category, campus_id, qty_on_hand },
    });
    return NextResponse.json({ success: true, id: data.id });
  }

  if (action === "update_resource") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Missing resource id" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (body.qty_on_hand !== undefined) {
      patch.qty_on_hand = body.qty_on_hand === null || body.qty_on_hand === ""
        ? null : Math.max(0, parseInt(String(body.qty_on_hand)) || 0);
    }
    if (typeof body.is_billable === "boolean") patch.is_billable = body.is_billable;
    if (typeof body.is_public === "boolean") patch.is_public = body.is_public;
    if (typeof body.requires_approval === "boolean") patch.requires_approval = body.requires_approval;
    if (typeof body.active === "boolean") patch.active = body.active;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const { error } = await admin.from("resources").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("audit_log").insert({
      actor_id: user.id, actor_email: user.email,
      action: "resource_update", target_type: "resource", target_id: id,
      detail: patch,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  const role = me?.role as UserRole | undefined;
  if (role !== "admin" && role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, admin: createAdminClient() };
}

// POST — actions: create_group, update_group, add_member, remove_member
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { user, admin } = gate;

  const body = await request.json().catch(() => ({}));
  const action = body?.action as string;

  if (action === "create_group") {
    const name = String(body.name ?? "").trim();
    const description = body.description ? String(body.description).trim().slice(0, 500) : null;
    if (!name) return NextResponse.json({ error: "Group name is required" }, { status: 400 });

    const { data, error } = await admin
      .from("groups")
      .insert({ name, description })
      .select("id")
      .single();
    if (error) {
      const msg = error.code === "23505" ? "A group with that name already exists" : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    await admin.from("audit_log").insert({
      actor_id: user.id, actor_email: user.email,
      action: "group_create", target_type: "group", target_id: data.id,
      detail: { name },
    });
    return NextResponse.json({ success: true, id: data.id });
  }

  if (action === "update_group") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Missing group id" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 500) || null;
    if (typeof body.active === "boolean") patch.active = body.active;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const { error } = await admin.from("groups").update(patch).eq("id", id);
    if (error) {
      const msg = error.code === "23505" ? "A group with that name already exists" : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    await admin.from("audit_log").insert({
      actor_id: user.id, actor_email: user.email,
      action: "group_update", target_type: "group", target_id: id,
      detail: patch,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "add_member") {
    const groupId = String(body.group_id ?? "");
    const userId = String(body.user_id ?? "");
    if (!groupId || !userId) return NextResponse.json({ error: "Missing group_id or user_id" }, { status: 400 });

    const { error } = await admin
      .from("group_members")
      .upsert({ group_id: groupId, user_id: userId, added_by: user.id }, { onConflict: "group_id,user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("audit_log").insert({
      actor_id: user.id, actor_email: user.email,
      action: "group_member_add", target_type: "group", target_id: groupId,
      detail: { user_id: userId },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "remove_member") {
    const groupId = String(body.group_id ?? "");
    const userId = String(body.user_id ?? "");
    if (!groupId || !userId) return NextResponse.json({ error: "Missing group_id or user_id" }, { status: 400 });

    const { error } = await admin
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("audit_log").insert({
      actor_id: user.id, actor_email: user.email,
      action: "group_member_remove", target_type: "group", target_id: groupId,
      detail: { user_id: userId },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBypassUsedEmail } from "@/lib/email";
import { fmtRange } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";
import { normalizeCode } from "@/lib/bypass";

// Consume a bypass code to create a within-48h booking. The resulting request
// is auto-APPROVED with admin_override=true (skips lead-time + conflict checks).
// Every use is logged and the issuing admin is emailed.

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles").select("full_name, email").eq("id", user.id).single();

  const body = await request.json();
  const rawCode: string = body.code ?? "";
  const code = normalizeCode(rawCode);
  if (!code) return NextResponse.json({ error: "Enter a bypass code." }, { status: 400 });

  const p = body.payload ?? {};
  if (!p.event_id || !p.space_id) {
    return NextResponse.json({ error: "Missing event or space." }, { status: 400 });
  }

  // The caller must be able to edit this event (creator / editor / super_admin).
  // RLS enforces this on the eventual insert; we also check space-request edit
  // rights up front via can_edit_event through a lightweight select.
  const admin = createAdminClient();

  // ── Validate the code ────────────────────────────────────
  const { data: bypass } = await admin
    .from("bypass_codes").select("*").eq("code", code).maybeSingle();

  if (!bypass || !bypass.active) {
    return NextResponse.json({ error: "Invalid or inactive bypass code." }, { status: 403 });
  }
  if (bypass.expires_at && new Date(bypass.expires_at) < new Date()) {
    return NextResponse.json({ error: "This bypass code has expired." }, { status: 403 });
  }
  if (bypass.max_uses != null && bypass.use_count >= bypass.max_uses) {
    return NextResponse.json({ error: "This bypass code has no uses remaining." }, { status: 403 });
  }

  // ── Verify the caller may edit this event ────────────────
  // Creator OR listed editor OR super_admin (mirrors can_edit_event RLS).
  const [{ data: ev }, { data: editor }, { data: prof }] = await Promise.all([
    admin.from("events").select("created_by").eq("id", p.event_id).single(),
    admin.from("event_editors").select("user_id").eq("event_id", p.event_id).eq("user_id", user.id).maybeSingle(),
    admin.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  const allowed =
    ev?.created_by === user.id || !!editor || prof?.role === "super_admin";
  if (!allowed) {
    return NextResponse.json({ error: "You can't edit this event." }, { status: 403 });
  }

  // ── Create the auto-approved override request ────────────
  const insertPayload = {
    event_id: p.event_id,
    space_id: p.space_id,
    scope: p.scope === "occurrence" ? "occurrence" : "whole_event",
    occurrence_id: p.scope === "occurrence" ? p.occurrence_id : null,
    tables_qty: p.tables_qty ?? 0,
    chairs_qty: p.chairs_qty ?? 0,
    setup_style: p.setup_style ?? null,
    setup_notes: p.setup_notes?.trim() || null,
    tech_needed: !!p.tech_needed,
    tech_details: p.tech_needed ? (p.tech_details?.trim() || null) : null,
    catering_needed: !!p.catering_needed,
    catering_details: p.catering_needed ? (p.catering_details?.trim() || null) : null,
    requested_by: user.id,
    status: "approved" as const,
    decided_by: user.id,
    decided_at: new Date().toISOString(),
    admin_override: true,
    bypass_code_id: bypass.id,
  };

  const { data: created, error: insErr } = await admin
    .from("space_requests").insert(insertPayload).select("id").single();
  if (insErr || !created) {
    return NextResponse.json({ error: insErr?.message ?? "Failed to create booking." }, { status: 500 });
  }

  // ── Increment use count ──────────────────────────────────
  const newCount = (bypass.use_count ?? 0) + 1;
  await admin.from("bypass_codes").update({ use_count: newCount }).eq("id", bypass.id);

  // ── Resolve context for the log + email ──────────────────
  const { data: ctx } = await admin
    .from("space_requests")
    .select(`
      scope, occurrence_id,
      events ( id, title, starts_at, ends_at, rrule ),
      spaces ( name, buildings ( name ), campuses ( name ) )
    `)
    .eq("id", created.id)
    .single();

  const c: any = ctx ?? {};
  let whenLabel = "";
  if (c.scope === "occurrence" && c.occurrence_id) {
    const { data: occ } = await admin
      .from("event_occurrences").select("starts_at, ends_at").eq("id", c.occurrence_id).single();
    if (occ) whenLabel = fmtRange(new Date(occ.starts_at), new Date(occ.ends_at));
  }
  if (!whenLabel && c.events) {
    whenLabel = `${fmtRange(new Date(c.events.starts_at), new Date(c.events.ends_at))} · ${describeRecurrence(c.events.rrule)}`;
  }

  const detail = {
    event_title: c.events?.title ?? null,
    event_id: c.events?.id ?? p.event_id,
    space_name: c.spaces?.name ?? null,
    building: c.spaces?.buildings?.name ?? null,
    campus: c.spaces?.campuses?.name ?? null,
    when: whenLabel,
  };

  // ── Log the use (the "second half" of the bypass page) ───
  await admin.from("bypass_code_uses").insert({
    code_id: bypass.id,
    code_text: bypass.code,
    used_by: user.id,
    used_by_email: user.email,
    request_id: created.id,
    detail,
  });

  await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "bypass_code_used",
    target_type: "space_request",
    target_id: created.id,
    detail: { code: bypass.code, ...detail },
  });

  // ── Email the issuer (never blocks the booking) ──────────
  try {
    if (bypass.issued_by_email) {
      const usesRemaining =
        bypass.max_uses == null
          ? `unlimited (used ${newCount} time${newCount === 1 ? "" : "s"})`
          : `${Math.max(0, bypass.max_uses - newCount)} of ${bypass.max_uses} remaining`;
      const { data: issuer } = await admin
        .from("profiles").select("full_name").eq("id", bypass.issued_by).maybeSingle();
      await sendBypassUsedEmail({
        to: bypass.issued_by_email,
        issuerName: issuer?.full_name ?? null,
        code: bypass.code,
        codeLabel: bypass.label,
        usedByName: me?.full_name ?? null,
        usedByEmail: user.email!,
        eventTitle: detail.event_title ?? "Event",
        eventId: detail.event_id,
        spaceName: detail.space_name ?? "Space",
        buildingName: detail.building,
        campusName: detail.campus,
        whenLabel,
        usesRemaining,
      });
    }
  } catch (e) {
    console.error("Bypass-used email failed:", e);
  }

  return NextResponse.json({ success: true, request_id: created.id });
}

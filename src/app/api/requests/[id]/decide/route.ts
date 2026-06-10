import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendDecisionEmail } from "@/lib/email";
import { fmtRange } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";

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

  // Update via RLS — only admins/campus admins will succeed
  const { data: updated, error } = await supabase
    .from("space_requests")
    .update({
      status,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      denial_reason: status === "denied" ? denial_reason?.trim() || null : null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select(`
      id, scope, occurrence_id, requested_by,
      events ( id, title, starts_at, ends_at, rrule ),
      spaces ( name, buildings ( name ), campuses ( name ) ),
      profiles!space_requests_requested_by_fkey ( full_name, email )
    `);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated?.length) {
    return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });
  }

  const r: any = updated[0];

  // Email the requester (never the admin)
  try {
    let whenLabel = "";
    if (r.scope === "occurrence" && r.occurrence_id) {
      const { data: occ } = await supabase
        .from("event_occurrences")
        .select("starts_at, ends_at")
        .eq("id", r.occurrence_id)
        .single();
      if (occ) whenLabel = fmtRange(new Date(occ.starts_at), new Date(occ.ends_at));
    }
    if (!whenLabel) {
      whenLabel = `${fmtRange(new Date(r.events.starts_at), new Date(r.events.ends_at))} · ${describeRecurrence(r.events.rrule)}`;
    }
    if (r.profiles?.email) {
      await sendDecisionEmail({
        to: r.profiles.email,
        requesterName: r.profiles.full_name,
        decision: status,
        eventTitle: r.events.title,
        eventId: r.events.id,
        spaceName: r.spaces?.name ?? "Space",
        buildingName: r.spaces?.buildings?.name ?? null,
        campusName: r.spaces?.campuses?.name ?? null,
        scopeLabel: r.scope === "whole_event" ? "Whole event (every occurrence)" : "Single date",
        whenLabel,
        denialReason: denial_reason ?? null,
      });
    }
  } catch (e) {
    console.error("Decision email failed:", e);
    // Decision still stands even if the email fails
  }

  return NextResponse.json({ success: true });
}

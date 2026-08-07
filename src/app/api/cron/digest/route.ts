import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPendingDigest, type DigestItem } from "@/lib/email";
import { fmtDay, fmtTimeRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

const TZ = "America/Los_Angeles";

function agoLabel(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((now.getTime() - then) / 86_400_000);
  if (days <= 0) return "submitted today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export async function GET(request: Request) {
  // Guard: only Vercel cron (or manual call) with the shared secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service-role client: cron has no user session, so RLS-gated reads would
  // return empty. Service role bypasses RLS — safe here (no user input).
  const supabase = createAdminClient();
  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(now);

  // All pending requests + the data the digest needs
  const { data: pendingRows, error } = await supabase
    .from("space_requests")
    .select(`
      id, scope, occurrence_id, created_at,
      spaces!inner ( name, campus_id, buildings ( name ), campuses ( name ) ),
      events ( id, title, ministry, starts_at, ends_at, rrule ),
      profiles!space_requests_requested_by_fkey ( full_name, email )
    `)
    .eq("status", "pending")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pending = pendingRows ?? [];
  if (pending.length === 0) {
    return NextResponse.json({ message: "No pending requests, no digest sent." });
  }

  // Resolve the actual event date/time for each request (occurrence-scoped
  // requests use the occurrence time; whole-event use the event start).
  const occIds = pending
    .filter((r: any) => r.scope === "occurrence" && r.occurrence_id)
    .map((r: any) => r.occurrence_id);
  const occMap = new Map<string, { starts_at: string; ends_at: string }>();
  if (occIds.length) {
    const { data: occs } = await supabase
      .from("event_occurrences")
      .select("id, starts_at, ends_at")
      .in("id", occIds);
    for (const o of occs ?? []) occMap.set(o.id, { starts_at: o.starts_at, ends_at: o.ends_at });
  }

  // Build a DigestItem per request, tagged with campus_id for scoping
  interface Tagged { campusId: string; item: DigestItem }
  const tagged: Tagged[] = pending.map((r: any) => {
    const occ = r.occurrence_id ? occMap.get(r.occurrence_id) : null;
    const startIso = occ?.starts_at ?? r.events?.starts_at;
    const endIso = occ?.ends_at ?? r.events?.ends_at;
    const start = startIso ? new Date(startIso) : null;
    const end = endIso ? new Date(endIso) : null;
    const recurringWholeEvent = r.scope === "whole_event" && r.events?.rrule;
    return {
      campusId: r.spaces?.campus_id,
      item: {
        dateLabel: start ? fmtDay(start) : "—",
        timeLabel: recurringWholeEvent
          ? "Recurring"
          : start && end ? fmtTimeRange(start, end) : "—",
        eventTitle: r.events?.title ?? "Untitled event",
        eventId: r.events?.id ?? "",
        location: `${r.spaces?.name ?? "Space"}${r.spaces?.buildings?.name ? ` — ${r.spaces.buildings.name}` : ""}${r.spaces?.campuses?.name ? `, ${r.spaces.campuses.name}` : ""}`,
        ministry: r.events?.ministry?.trim() || "—",
        submitter: r.profiles?.full_name || r.profiles?.email || "Unknown",
        submittedAgo: agoLabel(r.created_at, now),
      },
    };
  });

  // Recipients: super_admins (all campuses) + campus admins (their campuses)
  const [{ data: supers }, { data: campusAdmins }] = await Promise.all([
    supabase.from("profiles").select("email, full_name").eq("role", "super_admin"),
    supabase.from("campus_admins").select("campus_id, profiles ( email, full_name )"),
  ]);

  // recipient email -> { name, campusIds:Set|null(all) }
  const recipients = new Map<string, { name: string | null; all: boolean; campusIds: Set<string> }>();
  for (const s of supers ?? []) {
    if (s.email) recipients.set(s.email, { name: s.full_name, all: true, campusIds: new Set() });
  }
  for (const ca of (campusAdmins ?? []) as any[]) {
    const email = ca.profiles?.email;
    if (!email) continue;
    const existing = recipients.get(email);
    if (existing) {
      if (!existing.all) existing.campusIds.add(ca.campus_id);
    } else {
      recipients.set(email, { name: ca.profiles?.full_name ?? null, all: false, campusIds: new Set([ca.campus_id]) });
    }
  }

  // Send one scoped digest per recipient (only if they have pending items)
  let sent = 0;
  const results: { to: string; items: number }[] = [];
  for (const [email, r] of recipients) {
    const items = tagged
      .filter((t) => r.all || r.campusIds.has(t.campusId))
      .map((t) => t.item);
    if (items.length === 0) continue;
    try {
      await sendPendingDigest({ to: email, adminName: r.name, dateLabel: todayLabel, items });
      sent++;
      results.push({ to: email, items: items.length });
    } catch (e) {
      console.error(`Digest to ${email} failed:`, e);
    }
  }

  return NextResponse.json({
    success: true,
    date: todayLabel,
    pending_total: pending.length,
    recipients: recipients.size,
    sent,
    results,
  });
}

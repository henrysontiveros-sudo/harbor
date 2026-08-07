import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendFacilitiesSetupSheet,
  type SetupSheetBuilding,
  type SetupSheetRow,
} from "@/lib/email";
import { fmtTimeRange, laDateKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

const TZ = "America/Los_Angeles";

// Facilities setups exist only at Irvine — the only congregation with a
// facilities team doing day-of setups. Scope the run sheet to Irvine.
const CAMPUS_SLUG = "irvine";

export async function GET(request: Request) {
  // Guard: only Vercel cron (or manual call) with the shared secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service-role client: cron has no user session, so RLS-gated reads would
  // return empty. Service role bypasses RLS — safe here (no user input).
  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://harbor-teal.vercel.app";

  const now = new Date();
  const dateKey = laDateKey(now); // today in LA time (YYYY-MM-DD)
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(now);
  const dayStart = new Date(dateKey + "T00:00:00-07:00");
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  // Resolve the Irvine congregation
  const { data: campus } = await supabase
    .from("campuses")
    .select("id, name, slug")
    .eq("slug", CAMPUS_SLUG)
    .single();

  if (!campus) {
    return NextResponse.json({ error: `Congregation '${CAMPUS_SLUG}' not found` }, { status: 500 });
  }

  // Approved space requests at Irvine (same shape as the on-screen Setup Sheet)
  const { data: reqs, error: reqErr } = await supabase
    .from("space_requests")
    .select(`
      scope, occurrence_id, tables_qty, chairs_qty, setup_style, setup_notes,
      tech_needed, tech_details, catering_needed, catering_details,
      events!inner ( id, title, ministry, status ),
      spaces!inner ( name, campus_id, group_name, buildings ( name, sort_order ), sort_order ),
      profiles!space_requests_requested_by_fkey ( full_name, email )
    `)
    .eq("status", "approved")
    .eq("events.status", "active")
    .eq("spaces.campus_id", campus.id);

  if (reqErr) {
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }

  // Today's occurrences for those events
  const eventIds = [...new Set((reqs ?? []).map((r: any) => r.events.id))];
  let occs: any[] = [];
  if (eventIds.length) {
    const { data } = await supabase
      .from("event_occurrences")
      .select("id, event_id, starts_at, ends_at")
      .in("event_id", eventIds)
      .eq("cancelled", false)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at");
    occs = data ?? [];
  }

  // Flatten request × occurrence into run-sheet rows
  interface FlatRow extends SetupSheetRow {
    building: string;
    buildingSort: number;
    startIso: string;
    tables: number;
    chairs: number;
  }
  const flat: FlatRow[] = [];
  for (const r of (reqs ?? []) as any[]) {
    for (const o of occs) {
      if (o.event_id !== r.events.id) continue;
      if (r.scope === "occurrence" && r.occurrence_id !== o.id) continue;
      const tables = r.tables_qty ?? 0;
      const chairs = r.chairs_qty ?? 0;
      const logisticsBits: string[] = [];
      if (tables > 0) logisticsBits.push(`${tables} tables`);
      if (chairs > 0) logisticsBits.push(`${chairs} chairs`);
      if (r.setup_style && r.setup_style !== "As-Is") logisticsBits.push(r.setup_style);
      flat.push({
        building: r.spaces.buildings?.name ?? "Other",
        buildingSort: r.spaces.buildings?.sort_order ?? 999,
        startIso: o.starts_at,
        timeLabel: fmtTimeRange(new Date(o.starts_at), new Date(o.ends_at)),
        spaceName: r.spaces.name,
        groupName: r.spaces.group_name,
        eventTitle: r.events.title,
        ministry: r.events.ministry,
        contact: r.profiles?.full_name ?? r.profiles?.email ?? null,
        logistics: logisticsBits.length ? logisticsBits.join(" · ") : null,
        tech: r.tech_needed ? (r.tech_details || "requested") : null,
        catering: r.catering_needed ? (r.catering_details || "requested") : null,
        notes: r.setup_notes || null,
        tables,
        chairs,
      });
    }
  }

  // Nothing to set up today → send nothing (no empty emails)
  if (flat.length === 0) {
    return NextResponse.json({ message: "No setups today, no sheet sent.", date: dateLabel });
  }

  // Group by building (sorted), rows within a building sorted by start time
  flat.sort(
    (a, b) =>
      a.buildingSort - b.buildingSort ||
      a.building.localeCompare(b.building) ||
      a.startIso.localeCompare(b.startIso)
  );
  const buildingMap = new Map<string, SetupSheetRow[]>();
  for (const f of flat) {
    if (!buildingMap.has(f.building)) buildingMap.set(f.building, []);
    buildingMap.get(f.building)!.push({
      timeLabel: f.timeLabel,
      spaceName: f.spaceName,
      groupName: f.groupName,
      eventTitle: f.eventTitle,
      ministry: f.ministry,
      contact: f.contact,
      logistics: f.logistics,
      tech: f.tech,
      catering: f.catering,
      notes: f.notes,
    });
  }
  const buildings: SetupSheetBuilding[] = [...buildingMap.entries()].map(
    ([building, rows]) => ({ building, rows })
  );
  const totals = {
    setups: flat.length,
    tables: flat.reduce((s, f) => s + f.tables, 0),
    chairs: flat.reduce((s, f) => s + f.chairs, 0),
  };

  const sheetUrl = `${appUrl}/setup-sheet?campus=${campus.slug}&date=${dateKey}`;

  // Recipients: everyone flagged onto the Facilities team.
  const { data: facilities } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("facilities", true);

  const recipients = (facilities ?? []).filter((p: any) => p.email);
  if (recipients.length === 0) {
    return NextResponse.json({
      message: "Setups exist but no Facilities recipients configured.",
      date: dateLabel,
      setups: flat.length,
    });
  }

  let sent = 0;
  const results: { to: string }[] = [];
  for (const p of recipients as any[]) {
    try {
      await sendFacilitiesSetupSheet({
        to: p.email,
        recipientName: p.full_name ?? null,
        campusName: campus.name,
        dateLabel,
        buildings,
        totals,
        sheetUrl,
      });
      sent++;
      results.push({ to: p.email });
    } catch (e) {
      console.error(`Setup sheet to ${p.email} failed:`, e);
    }
  }

  return NextResponse.json({
    success: true,
    date: dateLabel,
    congregation: campus.name,
    setups: flat.length,
    buildings: buildings.length,
    recipients: recipients.length,
    sent,
    results,
  });
}

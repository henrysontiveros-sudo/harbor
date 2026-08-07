import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcs, type IcsEvent } from "@/lib/ics";

export const dynamic = "force-dynamic";

type Scope = "mine" | "ministries" | "congregations";

// Subscribable ICS feed. Authenticated by an unguessable per-user token in the
// URL (calendar apps send no cookies). Read-only; service-role client is safe
// because we resolve the caller strictly from the token and never take other
// user input that reaches the DB.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(request.url);
  const scopeRaw = (searchParams.get("scope") ?? "mine").toLowerCase();
  const scope: Scope = ["mine", "ministries", "congregations"].includes(scopeRaw)
    ? (scopeRaw as Scope)
    : "mine";

  // Basic token shape guard (uuid) before hitting the DB.
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response("Invalid calendar token", { status: 404 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://harbor-teal.vercel.app";

  const { data: me } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("calendar_token", token)
    .single();

  if (!me) {
    return new Response("Unknown calendar token", { status: 404 });
  }

  const isAdmin = me.role === "admin" || me.role === "super_admin";

  // ── Resolve which event ids belong in this feed ───────────
  let eventIds: string[] | null = null; // null = no restriction (all events)

  if (scope === "mine") {
    // Events I created OR am an editor of.
    const [{ data: created }, { data: edited }] = await Promise.all([
      supabase.from("events").select("id").eq("created_by", me.id),
      supabase.from("event_editors").select("event_id").eq("user_id", me.id),
    ]);
    const ids = new Set<string>();
    for (const r of created ?? []) ids.add(r.id);
    for (const r of edited ?? []) ids.add(r.event_id);
    eventIds = [...ids];
  } else if (scope === "ministries") {
    // Events for the groups I belong to (admins: all grouped events).
    if (isAdmin) {
      const { data } = await supabase.from("events").select("id").not("group_id", "is", null);
      eventIds = (data ?? []).map((r: any) => r.id);
    } else {
      const { data: gm } = await supabase
        .from("group_members").select("group_id").eq("user_id", me.id);
      const groupIds = (gm ?? []).map((r: any) => r.group_id);
      if (groupIds.length === 0) {
        eventIds = [];
      } else {
        const { data } = await supabase.from("events").select("id").in("group_id", groupIds);
        eventIds = (data ?? []).map((r: any) => r.id);
      }
    }
  } else if (scope === "congregations") {
    // Admins: their assigned congregations. Everyone else / super_admin: all
    // congregations (matches the app — everyone can view all).
    if (me.role === "admin") {
      const { data: ca } = await supabase
        .from("campus_admins").select("campus_id").eq("user_id", me.id);
      const campusIds = (ca ?? []).map((r: any) => r.campus_id);
      if (campusIds.length === 0) {
        eventIds = null; // no specific assignment -> show all
      } else {
        const { data } = await supabase.from("events").select("id").in("campus_id", campusIds);
        eventIds = (data ?? []).map((r: any) => r.id);
      }
    } else {
      eventIds = null; // all congregations
    }
  }

  // ── Load occurrences for those events ─────────────────────
  // Only future-ish window: from 60 days ago onward keeps feeds small.
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();

  let occQuery = supabase
    .from("event_occurrences")
    .select(`
      id, starts_at, ends_at, cancelled, event_id,
      events!inner (
        id, title, ministry, status, description,
        campuses ( name ),
        space_requests ( status, scope, occurrence_id, spaces ( name, buildings ( name ) ) )
      )
    `)
    .eq("cancelled", false)
    .eq("events.status", "active")
    .gte("starts_at", since)
    .order("starts_at");

  if (eventIds !== null) {
    if (eventIds.length === 0) {
      // Nothing in scope — return an empty but valid calendar.
      return icsResponse(feedName(me.full_name, scope), []);
    }
    occQuery = occQuery.in("event_id", eventIds);
  }

  const { data: occs } = await occQuery;

  const events: IcsEvent[] = (occs ?? []).map((o: any) => {
    const ev = o.events;
    const spaces = (ev.space_requests ?? [])
      .filter((sr: any) => (sr.status === "approved" || sr.status === "pending"))
      .filter((sr: any) => sr.scope === "whole_event" || sr.occurrence_id === o.id)
      .map((sr: any) => {
        const b = sr.spaces?.buildings?.name;
        return sr.spaces?.name ? (b ? `${sr.spaces.name} (${b})` : sr.spaces.name) : null;
      })
      .filter(Boolean);
    const congregation = ev.campuses?.name ?? null;
    const locationBits = [...spaces];
    if (congregation) locationBits.push(congregation);
    const descBits: string[] = [];
    if (ev.ministry) descBits.push(`Ministry: ${ev.ministry}`);
    if (congregation) descBits.push(`Congregation: ${congregation}`);
    if (ev.description) descBits.push(ev.description);
    return {
      uid: o.id,
      start: o.starts_at,
      end: o.ends_at,
      summary: ev.title,
      description: descBits.join("\n") || null,
      location: locationBits.join(", ") || null,
      url: `${appUrl}/events/${ev.id}`,
      status: "CONFIRMED",
    };
  });

  return icsResponse(feedName(me.full_name, scope), events);
}

function feedName(name: string | null, scope: Scope): string {
  const who = name?.split(" ")[0] ?? "My";
  const label =
    scope === "mine" ? "Bookings" :
    scope === "ministries" ? "Ministry Bookings" :
    "Congregation Bookings";
  return `Harbor — ${who}'s ${label}`;
}

function icsResponse(calName: string, events: IcsEvent[]): Response {
  const body = buildIcs(calName, events);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="harbor.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

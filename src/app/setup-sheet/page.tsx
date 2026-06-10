import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { fmtTimeRange, fmtDayFull, laDateKey } from "@/lib/dates";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

interface Row {
  occ_id: string;
  starts_at: string;
  ends_at: string;
  event_title: string;
  ministry: string | null;
  contact: string;
  space_name: string;
  building_name: string;
  group_name: string | null;
  tables_qty: number;
  chairs_qty: number;
  setup_style: string | null;
  setup_notes: string | null;
  tech_needed: boolean;
  tech_details: string | null;
  catering_needed: boolean;
  catering_details: string | null;
}

export default async function SetupSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; date?: string }>;
}) {
  const { campus: campusSlug, date } = await searchParams;
  const supabase = await createClient();

  const { data: campuses } = await supabase
    .from("campuses")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");

  const campus = campuses?.find((c) => c.slug === campusSlug) ?? campuses?.[0];
  const dateKey = date ?? laDateKey(new Date());
  const dayStart = new Date(dateKey + "T00:00:00-07:00");
  const dayEnd = new Date(dayStart.getTime() + 86400_000);

  // Approved space requests with occurrences on this day at this campus
  const { data: reqs } = await supabase
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
    .eq("spaces.campus_id", campus?.id ?? "");

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

  const rows: Row[] = [];
  for (const r of (reqs ?? []) as any[]) {
    for (const o of occs) {
      if (o.event_id !== r.events.id) continue;
      if (r.scope === "occurrence" && r.occurrence_id !== o.id) continue;
      rows.push({
        occ_id: o.id,
        starts_at: o.starts_at,
        ends_at: o.ends_at,
        event_title: r.events.title,
        ministry: r.events.ministry,
        contact: r.profiles?.full_name ?? r.profiles?.email ?? "",
        space_name: r.spaces.name,
        building_name: r.spaces.buildings?.name ?? "Other",
        group_name: r.spaces.group_name,
        tables_qty: r.tables_qty,
        chairs_qty: r.chairs_qty,
        setup_style: r.setup_style,
        setup_notes: r.setup_notes,
        tech_needed: r.tech_needed,
        tech_details: r.tech_details,
        catering_needed: r.catering_needed,
        catering_details: r.catering_details,
      });
    }
  }
  rows.sort((a, b) => a.building_name.localeCompare(b.building_name) || a.starts_at.localeCompare(b.starts_at));

  const byBuilding = new Map<string, Row[]>();
  for (const row of rows) {
    if (!byBuilding.has(row.building_name)) byBuilding.set(row.building_name, []);
    byBuilding.get(row.building_name)!.push(row);
  }

  const prevDate = laDateKey(new Date(dayStart.getTime() - 86400_000 + 12 * 3600_000));
  const nextDate = laDateKey(new Date(dayStart.getTime() + 86400_000 + 12 * 3600_000));
  const qs = (p: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { campus: campus?.slug, date: dateKey, ...p };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    return `/setup-sheet?${sp.toString()}`;
  };

  const totalTables = rows.reduce((s, r) => s + r.tables_qty, 0);
  const totalChairs = rows.reduce((s, r) => s + r.chairs_qty, 0);

  return (
    <>
      <div className="print:hidden"><Nav /></div>
      <main className="max-w-5xl mx-auto px-4 py-8 print:py-2">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-imperial">Setup Sheet</h1>
            <p className="text-sm text-ink/50">Day-of run sheet for facilities, tech, and catering teams.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={qs({ date: prevDate })} className="btn-secondary px-3 py-1.5 text-sm">←</Link>
            <Link href={qs({ date: laDateKey(new Date()) })} className="btn-secondary px-3 py-1.5 text-sm">Today</Link>
            <Link href={qs({ date: nextDate })} className="btn-secondary px-3 py-1.5 text-sm">→</Link>
            <PrintButton />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          {campuses?.map((c) => (
            <Link key={c.id} href={qs({ campus: c.slug })}
              className={`badge px-3 py-1.5 ${campus?.slug === c.slug ? "bg-imperial text-white" : "bg-white border border-ink/15 text-ink/70 hover:border-imperial/40"}`}>
              {c.name}
            </Link>
          ))}
        </div>

        {/* Print header */}
        <div className="mb-6">
          <h2 className="text-lg font-black text-imperial">
            {campus?.name} — {fmtDayFull(new Date(dayStart.getTime() + 12 * 3600_000))}
          </h2>
          <p className="text-sm text-ink/50">
            {rows.length} setup{rows.length === 1 ? "" : "s"}
            {totalTables > 0 && ` · ${totalTables} tables`}
            {totalChairs > 0 && ` · ${totalChairs} chairs`}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="card p-10 text-center text-ink/40">No approved setups for this day. 🌊</div>
        ) : (
          <div className="space-y-6">
            {[...byBuilding.entries()].map(([building, list]) => (
              <section key={building} className="break-inside-avoid">
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">{building}</h3>
                <div className="card divide-y divide-ink/5 print:border print:border-ink/20">
                  {list.map((r, i) => (
                    <div key={r.occ_id + i} className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="font-bold text-cerulean tabular-nums text-sm w-28 shrink-0">
                          {fmtTimeRange(new Date(r.starts_at), new Date(r.ends_at))}
                        </span>
                        <span className="font-bold text-sm">{r.space_name}</span>
                        {r.group_name && <span className="text-xs text-ink/40">{r.group_name}</span>}
                        <span className="text-sm text-ink/70">— {r.event_title}</span>
                        {r.ministry && <span className="text-xs text-ink/40">({r.ministry})</span>}
                        <span className="flex-1" />
                        <span className="text-xs text-ink/40">{r.contact}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        {(r.tables_qty > 0 || r.chairs_qty > 0 || r.setup_style) && (
                          <span className="font-medium">
                            {r.tables_qty > 0 && `${r.tables_qty} tables`}
                            {r.tables_qty > 0 && r.chairs_qty > 0 && " · "}
                            {r.chairs_qty > 0 && `${r.chairs_qty} chairs`}
                            {r.setup_style && r.setup_style !== "As-Is" && ` · ${r.setup_style}`}
                          </span>
                        )}
                        {r.tech_needed && (
                          <span className="text-cerulean">🎤 Tech: {r.tech_details || "requested"}</span>
                        )}
                        {r.catering_needed && (
                          <span className="text-[#8a6320]">🍽 Catering: {r.catering_details || "requested"}</span>
                        )}
                      </div>
                      {r.setup_notes && (
                        <p className="mt-1.5 text-sm text-ink/70 bg-sand/20 print:bg-transparent print:border print:border-ink/15 rounded-md px-2.5 py-1.5">
                          {r.setup_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

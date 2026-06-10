import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { fmtTimeRange, laDateKey, fmtDayFull } from "@/lib/dates";

export const dynamic = "force-dynamic";

interface OccRow {
  id: string;
  starts_at: string;
  ends_at: string;
  events: {
    id: string;
    title: string;
    ministry: string | null;
    status: string;
    campus_id: string;
    campuses: { name: string; slug: string } | null;
    space_requests: {
      status: string;
      scope: string;
      occurrence_id: string | null;
      spaces: { name: string; buildings: { name: string } | null } | null;
    }[];
  } | null;
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; week?: string }>;
}) {
  const { campus: campusSlug, week } = await searchParams;
  const supabase = await createClient();

  const { data: campuses } = await supabase
    .from("campuses")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");

  // Week window (LA): start Monday of requested week
  const now = new Date();
  const offset = week ? parseInt(week) : 0;
  const todayKey = laDateKey(now);
  const todayLA = new Date(todayKey + "T00:00:00-07:00");
  const dow = (todayLA.getUTCDay() + 6) % 7; // 0 = Monday
  const weekStart = new Date(todayLA.getTime() - dow * 86400_000 + offset * 7 * 86400_000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400_000);

  let query = supabase
    .from("event_occurrences")
    .select(
      `id, starts_at, ends_at,
       events!inner (
         id, title, ministry, status, campus_id,
         campuses ( name, slug ),
         space_requests ( status, scope, occurrence_id, spaces ( name, buildings ( name ) ) )
       )`
    )
    .eq("cancelled", false)
    .eq("events.status", "active")
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .order("starts_at");

  const { data: occRows } = await query;
  let occs = (occRows ?? []) as unknown as OccRow[];

  const selectedCampus = campuses?.find((c) => c.slug === campusSlug);
  if (selectedCampus) {
    occs = occs.filter((o) => o.events?.campus_id === selectedCampus.id);
  }

  // Group by LA date
  const byDay = new Map<string, OccRow[]>();
  for (const o of occs) {
    const key = laDateKey(new Date(o.starts_at));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(o);
  }

  const days: { key: string; date: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * 86400_000 + 12 * 3600_000);
    days.push({ key: laDateKey(d), date: d });
  }

  const weekLabel =
    offset === 0 ? "This Week" : offset === 1 ? "Next Week" : offset === -1 ? "Last Week" : `Week of ${fmtDayFull(weekStart)}`;

  const qs = (params: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { campus: campusSlug, week: week, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-imperial">{weekLabel}</h1>
            <p className="text-sm text-ink/50">
              Everything happening across Mariners — open to all staff.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={qs({ week: String(offset - 1) })} className="btn-secondary px-3 py-1.5 text-sm">←</Link>
            {offset !== 0 && (
              <Link href={qs({ week: undefined })} className="btn-secondary px-3 py-1.5 text-sm">Today</Link>
            )}
            <Link href={qs({ week: String(offset + 1) })} className="btn-secondary px-3 py-1.5 text-sm">→</Link>
          </div>
        </div>

        {/* Campus filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={qs({ campus: undefined })}
            className={`badge px-3 py-1.5 ${!campusSlug ? "bg-imperial text-white" : "bg-white border border-ink/15 text-ink/70 hover:border-imperial/40"}`}
          >
            All Campuses
          </Link>
          {campuses?.map((c) => (
            <Link
              key={c.id}
              href={qs({ campus: c.slug })}
              className={`badge px-3 py-1.5 ${campusSlug === c.slug ? "bg-imperial text-white" : "bg-white border border-ink/15 text-ink/70 hover:border-imperial/40"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="space-y-6">
          {days.map(({ key, date }) => {
            const dayOccs = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <section key={key}>
                <h2 className={`text-sm font-bold uppercase tracking-wide mb-2 ${isToday ? "text-cerulean" : "text-ink/40"}`}>
                  {fmtDayFull(date)} {isToday && <span className="badge bg-sky/20 text-cerulean ml-1">Today</span>}
                </h2>
                {dayOccs.length === 0 ? (
                  <p className="text-sm text-ink/30 pl-1">No events</p>
                ) : (
                  <div className="grid gap-2">
                    {dayOccs.map((o) => {
                      const ev = o.events!;
                      const spaces = ev.space_requests
                        .filter(
                          (sr) =>
                            sr.status === "approved" || sr.status === "pending"
                        )
                        .filter(
                          (sr) =>
                            sr.scope === "whole_event" ||
                            sr.occurrence_id === o.id
                        )
                        .map((sr) => sr.spaces?.name)
                        .filter(Boolean);
                      return (
                        <Link
                          key={o.id}
                          href={`/events/${ev.id}`}
                          className="card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:border-cerulean/50 transition-colors"
                        >
                          <span className="text-sm font-bold text-cerulean tabular-nums w-28 shrink-0">
                            {fmtTimeRange(new Date(o.starts_at), new Date(o.ends_at))}
                          </span>
                          <span className="font-medium flex-1 min-w-[180px]">{ev.title}</span>
                          {ev.ministry && (
                            <span className="text-xs text-ink/40">{ev.ministry}</span>
                          )}
                          <span className="badge bg-imperial/5 text-imperial">
                            {ev.campuses?.name}
                          </span>
                          {spaces.length > 0 && (
                            <span className="text-xs text-ink/50 w-full sm:w-auto">
                              {spaces.slice(0, 3).join(" · ")}
                              {spaces.length > 3 && ` +${spaces.length - 3} more`}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}

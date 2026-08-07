"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { laWallTimeToISO, fmtTimeRange } from "@/lib/dates";

interface Campus { id: string; name: string; slug: string }
interface Building { id: string; campus_id: string; name: string; sort_order: number }
interface Space {
  id: string; campus_id: string; building_id: string | null;
  group_name: string | null;
  name: string; capacity: number | null; amenities: string[]; sort_order: number;
}
interface Busy {
  space_id: string;
  starts_at: string;
  ends_at: string;
  title: string;
  status: string;
}

function defaultStart() {
  const d = new Date(Date.now() + 3600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}
function defaultEnd() {
  const d = new Date(Date.now() + 2 * 3600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export default function SpaceFinder({
  campuses, buildings, spaces,
}: { campuses: Campus[]; buildings: Building[]; spaces: Space[] }) {
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(defaultEnd());
  const [minCap, setMinCap] = useState("");
  const [busy, setBusy] = useState<Busy[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const supabase = createClient();

  async function check() {
    setErr(null);
    if (!start || !end) return;
    const sISO = laWallTimeToISO(start);
    const eISO = laWallTimeToISO(end);
    if (eISO <= sISO) { setErr("End must be after start."); return; }
    setLoading(true);
    // Pull all occurrences overlapping the window that have pending/approved requests
    const { data, error } = await supabase
      .from("space_requests")
      .select(
        `space_id, scope, occurrence_id, status,
         events!inner ( id, title, status ),
         spaces!inner ( campus_id )`
      )
      .in("status", ["pending", "approved"])
      .eq("events.status", "active")
      .eq("spaces.campus_id", campusId);
    if (error) { setErr(error.message); setLoading(false); return; }

    const eventIds = [...new Set((data ?? []).map((r: any) => r.events.id))];
    let occRows: any[] = [];
    if (eventIds.length) {
      const { data: occs } = await supabase
        .from("event_occurrences")
        .select("id, event_id, starts_at, ends_at, cancelled")
        .in("event_id", eventIds)
        .eq("cancelled", false)
        .lt("starts_at", eISO)
        .gt("ends_at", sISO);
      occRows = occs ?? [];
    }

    const busyList: Busy[] = [];
    for (const r of (data ?? []) as any[]) {
      for (const o of occRows) {
        if (o.event_id !== r.events.id) continue;
        if (r.scope === "occurrence" && r.occurrence_id !== o.id) continue;
        busyList.push({
          space_id: r.space_id,
          starts_at: o.starts_at,
          ends_at: o.ends_at,
          title: r.events.title,
          status: r.status,
        });
      }
    }
    setBusy(busyList);
    setLoading(false);
  }

  const campusBuildings = useMemo(
    () => buildings.filter((b) => b.campus_id === campusId),
    [buildings, campusId]
  );

  const busyBySpace = useMemo(() => {
    const m = new Map<string, Busy[]>();
    for (const b of busy ?? []) {
      if (!m.has(b.space_id)) m.set(b.space_id, []);
      m.get(b.space_id)!.push(b);
    }
    return m;
  }, [busy]);

  const minCapNum = minCap ? parseInt(minCap) : 0;

  return (
    <div>
      <div className="card p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:items-end">
        <div>
          <label className="label">Congregation</label>
          <select className="input" value={campusId} onChange={(e) => { setCampusId(e.target.value); setBusy(null); }}>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Start</label>
          <input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label">End</label>
          <input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <label className="label">Min capacity</label>
          <input type="number" className="input" placeholder="Any" value={minCap} onChange={(e) => setMinCap(e.target.value)} />
        </div>
        <button onClick={check} disabled={loading} className="btn-primary h-11 sm:h-[38px]">
          {loading ? "Checking…" : "Check availability"}
        </button>
      </div>
      {err && <p className="text-sm text-coral mb-4">{err}</p>}

      {busy !== null && (
        <div className="space-y-6">
          {campusBuildings.map((b) => {
            const list = spaces
              .filter((s) => s.building_id === b.id)
              .filter((s) => !minCapNum || (s.capacity ?? 0) >= minCapNum);
            if (!list.length) return null;
            const groups: { label: string | null; items: Space[] }[] = [];
            for (const s of list) {
              let g = groups.find((x) => x.label === (s.group_name ?? null));
              if (!g) { g = { label: s.group_name ?? null, items: [] }; groups.push(g); }
              g.items.push(s);
            }
            return (
              <section key={b.id}>
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">{b.name}</h2>
                <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.label ?? "_"}>
                    {g.label && (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/30 mb-1.5 pl-1 border-l-2 border-cerulean/30">
                        {g.label}
                      </h3>
                    )}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {g.items.map((s) => {
                    const conflicts = busyBySpace.get(s.id) ?? [];
                    const free = conflicts.length === 0;
                    return (
                      <div key={s.id} className={`card px-4 py-3 ${free ? "" : "opacity-80"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{s.name}</span>
                          <span className={`badge ${free ? "bg-radiant/20 text-[#5a7a10]" : "bg-coral/15 text-coral"}`}>
                            {free ? "Free" : "Booked"}
                          </span>
                        </div>
                        <div className="text-xs text-ink/40 mt-1 flex flex-wrap gap-x-3">
                          {s.capacity && <span>Cap {s.capacity}</span>}
                          {s.amenities.slice(0, 3).map((a) => <span key={a}>{a}</span>)}
                        </div>
                        {!free && (
                          <div className="mt-2 text-xs text-coral/90 space-y-0.5">
                            {conflicts.slice(0, 2).map((c, i) => (
                              <div key={i}>
                                {c.title} · {fmtTimeRange(new Date(c.starts_at), new Date(c.ends_at))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                    </div>
                  </div>
                ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

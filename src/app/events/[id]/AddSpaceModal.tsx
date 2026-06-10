"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtRange } from "@/lib/dates";
import { SETUP_STYLES } from "@/lib/types";

interface Conflict {
  conflict_starts_at: string;
  conflict_ends_at: string;
  event_title: string;
  event_id: string;
  request_status: string;
}

export default function AddSpaceModal({
  event, occurrences, existingRequests, spaces, buildings, onClose,
}: {
  event: any;
  occurrences: any[];
  existingRequests: any[];
  spaces: any[];
  buildings: any[];
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [spaceId, setSpaceId] = useState("");
  const [scope, setScope] = useState<"whole_event" | "occurrence">("whole_event");
  const [occurrenceId, setOccurrenceId] = useState(occurrences[0]?.id ?? "");
  const [tables, setTables] = useState(0);
  const [chairs, setChairs] = useState(0);
  const [setupStyle, setSetupStyle] = useState("As-Is");
  const [setupNotes, setSetupNotes] = useState("");
  const [techNeeded, setTechNeeded] = useState(false);
  const [techDetails, setTechDetails] = useState("");
  const [cateringNeeded, setCateringNeeded] = useState(false);
  const [cateringDetails, setCateringDetails] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isRecurring = occurrences.length > 1;

  const proposedTimes = useMemo(() => {
    if (scope === "whole_event") {
      return occurrences.map((o) => ({ starts_at: o.starts_at, ends_at: o.ends_at }));
    }
    const occ = occurrences.find((o) => o.id === occurrenceId);
    return occ ? [{ starts_at: occ.starts_at, ends_at: occ.ends_at }] : [];
  }, [scope, occurrenceId, occurrences]);

  // Live conflict check whenever space/scope changes
  useEffect(() => {
    if (!spaceId || proposedTimes.length === 0) { setConflicts(null); return; }
    let stale = false;
    setChecking(true);
    supabase
      .rpc("check_space_conflicts", {
        p_space: spaceId,
        p_times: proposedTimes,
        p_exclude_event: event.id,
      })
      .then(({ data, error }) => {
        if (stale) return;
        setChecking(false);
        if (error) { setErr(error.message); return; }
        setConflicts(data ?? []);
      });
    return () => { stale = true; };
  }, [spaceId, proposedTimes]);

  const blocked = (conflicts?.length ?? 0) > 0;

  const alreadyRequested = useMemo(() => {
    if (!spaceId) return false;
    return existingRequests.some(
      (r) =>
        r.space_id === spaceId &&
        ["pending", "approved"].includes(r.status) &&
        (r.scope === "whole_event" ||
          scope === "whole_event" ||
          r.occurrence_id === occurrenceId)
    );
  }, [spaceId, scope, occurrenceId, existingRequests]);

  async function submit() {
    setErr(null);
    if (!spaceId) { setErr("Pick a space."); return; }
    if (blocked) return;
    if (alreadyRequested) { setErr("You already have a request for this space."); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("space_requests").insert({
      event_id: event.id,
      space_id: spaceId,
      scope,
      occurrence_id: scope === "occurrence" ? occurrenceId : null,
      tables_qty: tables,
      chairs_qty: chairs,
      setup_style: setupStyle,
      setup_notes: setupNotes.trim() || null,
      tech_needed: techNeeded,
      tech_details: techNeeded ? techDetails.trim() || null : null,
      catering_needed: cateringNeeded,
      catering_details: cateringNeeded ? cateringDetails.trim() || null : null,
      requested_by: user!.id,
      status: "pending",
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
    onClose();
  }

  const selectedSpace = spaces.find((s) => s.id === spaceId);

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-start justify-center overflow-y-auto py-8 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-imperial">Request a Space</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl leading-none">×</button>
        </div>

        {/* Space picker */}
        <div>
          <label className="label">Space *</label>
          <select className="input" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
            <option value="">Choose a space…</option>
            {buildings.map((b) => {
              const list = spaces.filter((s) => s.building_id === b.id);
              if (!list.length) return null;
              return (
                <optgroup key={b.id} label={b.name}>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.capacity ? ` (cap ${s.capacity})` : ""}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {selectedSpace?.amenities?.length > 0 && (
            <p className="text-xs text-ink/40 mt-1">
              Built-in: {selectedSpace.amenities.join(", ")}
            </p>
          )}
        </div>

        {/* Scope */}
        {isRecurring && (
          <div>
            <label className="label">Apply to</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setScope("whole_event")}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium ${scope === "whole_event" ? "border-cerulean bg-cerulean/5 text-cerulean" : "border-ink/15 text-ink/60"}`}>
                Whole event
                <span className="block text-xs font-normal opacity-70">All {occurrences.length} occurrences</span>
              </button>
              <button type="button" onClick={() => setScope("occurrence")}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium ${scope === "occurrence" ? "border-cerulean bg-cerulean/5 text-cerulean" : "border-ink/15 text-ink/60"}`}>
                Single date
                <span className="block text-xs font-normal opacity-70">One occurrence only</span>
              </button>
            </div>
            {scope === "occurrence" && (
              <select className="input mt-2" value={occurrenceId} onChange={(e) => setOccurrenceId(e.target.value)}>
                {occurrences.map((o) => (
                  <option key={o.id} value={o.id}>
                    {fmtRange(new Date(o.starts_at), new Date(o.ends_at))}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Conflict banner */}
        {spaceId && (checking ? (
          <p className="text-xs text-ink/40">Checking availability…</p>
        ) : blocked ? (
          <div className="rounded-lg bg-coral/10 border border-coral/30 px-4 py-3">
            <p className="text-sm font-bold text-coral mb-1">
              ⚠ This space is already booked at {conflicts!.length === 1 ? "this time" : `${conflicts!.length} of these times`}
            </p>
            <ul className="text-xs text-coral/90 space-y-0.5">
              {conflicts!.slice(0, 4).map((c, i) => (
                <li key={i}>
                  {c.event_title} — {fmtRange(new Date(c.conflict_starts_at), new Date(c.conflict_ends_at))} ({c.request_status})
                </li>
              ))}
              {conflicts!.length > 4 && <li>…and {conflicts!.length - 4} more</li>}
            </ul>
            <p className="text-xs text-coral/80 mt-1.5">
              {scope === "whole_event" && isRecurring
                ? "Tip: switch to “Single date” to book the dates that are free."
                : "Pick a different space or time."}
            </p>
          </div>
        ) : alreadyRequested ? (
          <div className="rounded-lg bg-sand/40 border border-sand px-4 py-3 text-sm text-[#8a6320]">
            You already have an active request for this space.
          </div>
        ) : (
          <div className="rounded-lg bg-radiant/10 border border-radiant/30 px-4 py-2.5 text-sm text-[#5a7a10]">
            ✓ Available for {scope === "whole_event" ? `all ${occurrences.length} occurrence${occurrences.length > 1 ? "s" : ""}` : "this date"}
          </div>
        ))}

        {/* Setup */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Tables</label>
            <input type="number" min={0} className="input" value={tables}
              onChange={(e) => setTables(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Chairs</label>
            <input type="number" min={0} className="input" value={chairs}
              onChange={(e) => setChairs(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Setup style</label>
            <select className="input" value={setupStyle} onChange={(e) => setSetupStyle(e.target.value)}>
              {SETUP_STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Setup notes — placement details</label>
          <textarea className="input" rows={3} value={setupNotes} onChange={(e) => setSetupNotes(e.target.value)}
            placeholder="e.g. 6 rounds of 8 facing the stage, 2 rows of chairs along the back wall, registration table by the door…" />
        </div>

        {/* Tech & catering */}
        <div className="space-y-3">
          <div className="rounded-lg border border-ink/10 px-4 py-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={techNeeded} onChange={(e) => setTechNeeded(e.target.checked)}
                className="w-4 h-4 accent-cerulean" />
              <span className="font-medium text-sm">Tech / AV needed</span>
            </label>
            {techNeeded && (
              <textarea className="input mt-2" rows={2} value={techDetails}
                onChange={(e) => setTechDetails(e.target.value)}
                placeholder="e.g. 2 handheld mics, projector + screen, livestream…" />
            )}
          </div>
          <div className="rounded-lg border border-ink/10 px-4 py-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={cateringNeeded} onChange={(e) => setCateringNeeded(e.target.checked)}
                className="w-4 h-4 accent-cerulean" />
              <span className="font-medium text-sm">Catering needed</span>
            </label>
            {cateringNeeded && (
              <textarea className="input mt-2" rows={2} value={cateringDetails}
                onChange={(e) => setCateringDetails(e.target.value)}
                placeholder="e.g. coffee + pastries for 40, lunch at noon…" />
            )}
          </div>
        </div>

        {err && <p className="text-sm text-coral">{err}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={busy || blocked || checking || !spaceId || alreadyRequested}
            className="btn-primary">
            {busy ? "Submitting…" : "Submit for approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

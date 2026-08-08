"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtRange } from "@/lib/dates";

export default function AddResourceModal({
  event, occurrences, existingRequests, resources, onClose, editRequest,
}: {
  event: any;
  occurrences: any[];
  existingRequests: any[];
  resources: any[];
  onClose: () => void;
  editRequest?: any;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [resourceId, setResourceId] = useState(editRequest?.resource_id ?? "");
  const [scope, setScope] = useState<"whole_event" | "occurrence">(editRequest?.scope ?? "whole_event");
  const [occurrenceId, setOccurrenceId] = useState(editRequest?.occurrence_id ?? occurrences[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number>(editRequest?.quantity ?? 1);
  const [notes, setNotes] = useState(editRequest?.notes ?? "");
  const [committed, setCommitted] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isRecurring = occurrences.length > 1;
  const selected = resources.find((r) => r.id === resourceId);
  const isVehicle = selected?.category === "vehicle";
  // Vehicles are single-unit (implicit capacity 1); equipment uses qty_on_hand (null = untracked)
  const capacity: number | null = selected
    ? (isVehicle ? 1 : (selected.qty_on_hand ?? null))
    : null;

  const proposedTimes = useMemo(() => {
    if (scope === "whole_event") {
      return occurrences.map((o) => ({ starts_at: o.starts_at, ends_at: o.ends_at }));
    }
    const occ = occurrences.find((o) => o.id === occurrenceId);
    return occ ? [{ starts_at: occ.starts_at, ends_at: occ.ends_at }] : [];
  }, [scope, occurrenceId, occurrences]);

  // Live availability check whenever resource/scope changes
  useEffect(() => {
    if (!resourceId || proposedTimes.length === 0) { setCommitted(null); return; }
    let stale = false;
    setChecking(true);
    supabase
      .rpc("check_resource_availability", {
        p_resource: resourceId,
        p_times: proposedTimes,
        p_exclude_event: event.id,
      })
      .then(({ data, error }) => {
        if (stale) return;
        setChecking(false);
        if (error) { setErr(error.message); return; }
        // RPC returns a single aggregate row
        const row = Array.isArray(data) ? data[0] : data;
        setCommitted(row?.committed_qty ?? 0);
      });
    return () => { stale = true; };
  }, [resourceId, proposedTimes]);

  const remaining = capacity != null && committed != null ? capacity - committed : null;
  const overbooked = remaining != null && quantity > remaining;

  async function submit() {
    setErr(null);
    if (!resourceId) { setErr("Pick a resource."); return; }
    if (quantity < 1) { setErr("Quantity must be at least 1."); return; }
    if (overbooked) { setErr(`Only ${remaining} available for the selected time.`); return; }

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      event_id: event.id,
      resource_id: resourceId,
      scope,
      occurrence_id: scope === "occurrence" ? occurrenceId : null,
      quantity,
      notes: notes.trim() || null,
      status: "pending" as const,
    };
    const { error } = editRequest
      ? await supabase.from("resource_requests").update(payload).eq("id", editRequest.id)
      : await supabase.from("resource_requests").insert({ ...payload, requested_by: user!.id });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
    onClose();
  }

  // Group catalog by category for the dropdown
  const vehicles = resources.filter((r) => r.category === "vehicle");
  const equipment = resources.filter((r) => r.category === "equipment");

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-start justify-center overflow-y-auto py-4 sm:py-8 px-3 sm:px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-imperial">{editRequest ? "Edit Resource Request" : "Request a Resource"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink/40 hover:text-ink text-2xl leading-none w-10 h-10 -mr-2 -mt-2 flex items-center justify-center">×</button>
        </div>

        {/* Resource picker */}
        <div>
          <label className="label">Resource *</label>
          <select className="input" value={resourceId} onChange={(e) => { setResourceId(e.target.value); setQuantity(1); }}>
            <option value="">Choose a resource…</option>
            {equipment.length > 0 && (
              <optgroup label="Equipment">
                {equipment.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.qty_on_hand != null ? ` (${r.qty_on_hand} on hand)` : ""}{r.is_billable ? " · billable" : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {vehicles.length > 0 && (
              <optgroup label="Vehicles">
                {vehicles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.is_billable ? " · billable" : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Scope */}
        {isRecurring && (
          <div>
            <label className="label">Apply to</label>
            <div className="flex flex-col sm:flex-row gap-2">
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

        {/* Quantity (equipment only; vehicles are single-unit) */}
        {selected && !isVehicle && (
          <div>
            <label className="label">Quantity *</label>
            <input type="number" min={1} max={capacity ?? undefined} className="input w-32" value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
        )}

        {/* Availability banner */}
        {resourceId && (checking ? (
          <p className="text-xs text-ink/40">Checking availability…</p>
        ) : overbooked ? (
          <div className="rounded-lg bg-coral/10 border border-coral/30 px-4 py-3">
            <p className="text-sm font-bold text-coral mb-1">
              ⚠ Not enough available at this time
            </p>
            <p className="text-xs text-coral/90">
              {capacity} on hand · {committed} already committed for overlapping bookings · {remaining} left.
              Reduce the quantity or pick a different date.
            </p>
          </div>
        ) : remaining != null ? (
          <div className="rounded-lg bg-radiant/10 border border-radiant/30 px-4 py-2.5 text-sm text-[#5a7a10]">
            ✓ {remaining} of {capacity} available for {scope === "whole_event" ? `all ${occurrences.length} occurrence${occurrences.length > 1 ? "s" : ""}` : "this date"}
            {committed! > 0 && <span className="text-ink/40"> ({committed} committed elsewhere)</span>}
          </div>
        ) : isVehicle && committed! > 0 ? (
          <div className="rounded-lg bg-coral/10 border border-coral/30 px-4 py-3 text-sm text-coral">
            ⚠ This vehicle is already booked for an overlapping time.
          </div>
        ) : isVehicle ? (
          <div className="rounded-lg bg-radiant/10 border border-radiant/30 px-4 py-2.5 text-sm text-[#5a7a10]">
            ✓ Available for {scope === "whole_event" ? "the whole event" : "this date"}
          </div>
        ) : null)}

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. deliver to the east lobby by 8am; driver needs the vehicle-use form on file…" />
        </div>

        {err && <p className="text-sm text-coral">{err}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary py-2.5 sm:py-2">Cancel</button>
          <button onClick={submit}
            disabled={busy || checking || !resourceId || overbooked || (isVehicle && (committed ?? 0) > 0 && !editRequest)}
            className="btn-primary py-2.5 sm:py-2">
            {busy ? "Submitting…" : editRequest ? "Save & resubmit for approval" : "Submit for approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

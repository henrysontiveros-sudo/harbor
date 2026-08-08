"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtRange } from "@/lib/dates";

export default function AddServiceModal({
  event, occurrences, existingRequests, services, onClose, editRequest,
}: {
  event: any;
  occurrences: any[];
  existingRequests: any[];
  services: any[];
  onClose: () => void;
  editRequest?: any;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [serviceId, setServiceId] = useState(editRequest?.service_id ?? "");
  const [scope, setScope] = useState<"whole_event" | "occurrence">(editRequest?.scope ?? "whole_event");
  const [occurrenceId, setOccurrenceId] = useState(editRequest?.occurrence_id ?? occurrences[0]?.id ?? "");
  const [details, setDetails] = useState(editRequest?.details ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isRecurring = occurrences.length > 1;

  const alreadyRequested = useMemo(() => {
    if (!serviceId) return false;
    return existingRequests.some(
      (r) =>
        r.id !== editRequest?.id &&
        r.service_id === serviceId &&
        ["pending", "approved"].includes(r.status) &&
        (r.scope === "whole_event" || scope === "whole_event" || r.occurrence_id === occurrenceId)
    );
  }, [serviceId, scope, occurrenceId, existingRequests, editRequest]);

  async function submit() {
    setErr(null);
    if (!serviceId) { setErr("Pick a service."); return; }
    if (alreadyRequested) { setErr("You already requested this service."); return; }

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      event_id: event.id,
      service_id: serviceId,
      scope,
      occurrence_id: scope === "occurrence" ? occurrenceId : null,
      details: details.trim() || null,
      status: "pending" as const,
    };
    const { error } = editRequest
      ? await supabase.from("service_requests").update(payload).eq("id", editRequest.id)
      : await supabase.from("service_requests").insert({ ...payload, requested_by: user!.id });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-start justify-center overflow-y-auto py-4 sm:py-8 px-3 sm:px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card w-full max-w-lg p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-imperial">{editRequest ? "Edit Service Request" : "Request a Service"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink/40 hover:text-ink text-2xl leading-none w-10 h-10 -mr-2 -mt-2 flex items-center justify-center">×</button>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-ink/50">This congregation has no services set up yet.</p>
        ) : (
          <>
            {/* Service picker */}
            <div>
              <label className="label">Service *</label>
              <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Choose a service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
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

            {alreadyRequested && (
              <div className="rounded-lg bg-sand/40 border border-sand px-4 py-3 text-sm text-[#8a6320]">
                You already have an active request for this service.
              </div>
            )}

            <div>
              <label className="label">Details</label>
              <textarea className="input" rows={3} value={details} onChange={(e) => setDetails(e.target.value)}
                placeholder="Anything the team needs to know — headcount, ages, timing, special requirements…" />
            </div>
          </>
        )}

        {err && <p className="text-sm text-coral">{err}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary py-2.5 sm:py-2">Cancel</button>
          <button onClick={submit}
            disabled={busy || !serviceId || alreadyRequested}
            className="btn-primary py-2.5 sm:py-2">
            {busy ? "Submitting…" : editRequest ? "Save & resubmit for approval" : "Submit for approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

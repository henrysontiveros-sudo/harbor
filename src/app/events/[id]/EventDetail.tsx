"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtRange, fmtDay, fmtTimeRange } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";
import StatusBadge from "@/components/StatusBadge";
import AddSpaceModal from "./AddSpaceModal";
import AddResourceModal from "./AddResourceModal";
import EditorsPanel from "./EditorsPanel";

export default function EventDetail({
  event, occurrences, requests, editors, spaces, buildings, resources, resourceRequests, canEdit, currentUserId,
}: {
  event: any;
  occurrences: any[];
  requests: any[];
  editors: any[];
  spaces: any[];
  buildings: any[];
  resources: any[];
  resourceRequests: any[];
  canEdit: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [showAllOccs, setShowAllOccs] = useState(false);

  const activeOccs = useMemo(
    () => occurrences.filter((o) => !o.cancelled),
    [occurrences]
  );

  async function cancelRequest(id: string) {
    await supabase.from("space_requests").update({ status: "cancelled" }).eq("id", id);
    router.refresh();
  }

  async function cancelResourceRequest(id: string) {
    await supabase.from("resource_requests").update({ status: "cancelled" }).eq("id", id);
    router.refresh();
  }

  async function cancelEvent() {
    if (!confirm("Cancel this event? All space requests will be released.")) return;
    await supabase.from("events").update({ status: "cancelled" }).eq("id", event.id);
    await supabase.from("space_requests").update({ status: "cancelled" }).eq("event_id", event.id).in("status", ["pending", "approved"]);
    router.refresh();
  }

  const visibleOccs = showAllOccs ? activeOccs : activeOccs.slice(0, 6);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-imperial">
            {event.title}
            {event.status === "cancelled" && (
              <span className="badge bg-ink/10 text-ink/40 ml-2 align-middle">Cancelled</span>
            )}
          </h1>
          <p className="text-sm text-ink/50 mt-1">
            {fmtRange(new Date(event.starts_at), new Date(event.ends_at))}
            {" · "}{describeRecurrence(event.rrule)}
            {" · "}{event.campuses?.name}
            {event.ministry && <> · {event.ministry}</>}
          </p>
          {event.description && (
            <p className="text-sm text-ink/70 mt-2 max-w-xl">{event.description}</p>
          )}
          <p className="text-xs text-ink/40 mt-1">
            Created by {event.profiles?.full_name ?? event.profiles?.email}
          </p>
        </div>
        {canEdit && event.status === "active" && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onClick={() => setShowAdd(true)} className="btn-primary py-2.5 sm:py-2 flex-1 sm:flex-none">+ Request a space</button>
            <button onClick={() => setShowAddResource(true)} className="btn-secondary py-2.5 sm:py-2 flex-1 sm:flex-none">+ Request a resource</button>
            <button onClick={cancelEvent} className="btn-danger py-2.5 sm:py-2">Cancel event</button>
          </div>
        )}
      </div>

      {/* Space requests */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">
          Spaces ({requests.filter((r) => !["cancelled"].includes(r.status)).length})
        </h2>
        {requests.filter((r) => r.status !== "cancelled").length === 0 ? (
          <div className="card p-8 text-center text-ink/40">
            <p className="mb-3">No spaces requested yet.</p>
            {canEdit && (
              <button onClick={() => setShowAdd(true)} className="btn-primary">
                Request your first space
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {requests.filter((r) => r.status !== "cancelled").map((r) => {
              const occ = r.occurrence_id
                ? occurrences.find((o) => o.id === r.occurrence_id)
                : null;
              return (
                <div key={r.id} className="card px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{r.spaces?.name}</span>
                    <span className="text-xs text-ink/40">{r.spaces?.buildings?.name}</span>
                    <StatusBadge status={r.status} />
                    <span className="badge bg-imperial/5 text-imperial">
                      {r.scope === "whole_event"
                        ? "Whole event"
                        : occ
                          ? fmtDay(new Date(occ.starts_at))
                          : "One occurrence"}
                    </span>
                    <span className="flex-1" />
                    {canEdit && ["pending", "approved"].includes(r.status) && (
                      <>
                        <button onClick={() => setEditingRequest(r)}
                          className="text-xs text-cerulean hover:underline px-2 py-2 -my-1">
                          Edit
                        </button>
                        <button onClick={() => cancelRequest(r.id)}
                          className="text-xs text-coral hover:underline px-2 py-2 -my-1">
                          Cancel
                        </button>
                      </>
                    )}
                    {canEdit && r.status === "denied" && (
                      <button onClick={() => setEditingRequest(r)}
                        className="text-xs text-cerulean hover:underline px-2 py-2 -my-1">
                        Edit & resubmit
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-ink/50 mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                    {(r.tables_qty > 0 || r.chairs_qty > 0) && (
                      <span>
                        {r.tables_qty > 0 && `${r.tables_qty} tables`}
                        {r.tables_qty > 0 && r.chairs_qty > 0 && " · "}
                        {r.chairs_qty > 0 && `${r.chairs_qty} chairs`}
                        {r.setup_style && ` · ${r.setup_style}`}
                      </span>
                    )}
                    {r.tech_needed && <span className="text-cerulean">Tech: {r.tech_details || "requested"}</span>}
                    {r.catering_needed && <span className="text-[#8a6320]">Catering: {r.catering_details || "requested"}</span>}
                  </div>
                  {r.setup_notes && (
                    <p className="text-xs text-ink/60 mt-1.5 bg-sand/20 rounded-md px-2.5 py-1.5">
                      <span className="font-bold">Setup notes:</span> {r.setup_notes}
                    </p>
                  )}
                  {r.status === "denied" && r.denial_reason && (
                    <p className="text-xs text-coral mt-1.5">Denied: {r.denial_reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Resource requests */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">
          Resources ({resourceRequests.filter((r) => r.status !== "cancelled").length})
        </h2>
        {resourceRequests.filter((r) => r.status !== "cancelled").length === 0 ? (
          <div className="card p-6 text-center text-ink/40">
            <p className="mb-3 text-sm">No resources requested yet.</p>
            {canEdit && event.status === "active" && (
              <button onClick={() => setShowAddResource(true)} className="btn-secondary">
                Request a resource
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {resourceRequests.filter((r) => r.status !== "cancelled").map((r) => {
              const occ = r.occurrence_id
                ? occurrences.find((o) => o.id === r.occurrence_id)
                : null;
              const isVehicle = r.resources?.category === "vehicle";
              return (
                <div key={r.id} className="card px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{r.resources?.name}</span>
                    <span className="text-xs text-ink/40">{isVehicle ? "Vehicle" : "Equipment"}</span>
                    {!isVehicle && r.quantity > 1 && (
                      <span className="badge bg-cerulean/5 text-cerulean">×{r.quantity}</span>
                    )}
                    <StatusBadge status={r.status} />
                    <span className="badge bg-imperial/5 text-imperial">
                      {r.scope === "whole_event"
                        ? "Whole event"
                        : occ
                          ? fmtDay(new Date(occ.starts_at))
                          : "One occurrence"}
                    </span>
                    {r.resources?.is_billable && (
                      <span className="badge bg-[#8a6320]/10 text-[#8a6320]">Billable</span>
                    )}
                    <span className="flex-1" />
                    {canEdit && ["pending", "approved"].includes(r.status) && (
                      <>
                        <button onClick={() => setEditingResource(r)}
                          className="text-xs text-cerulean hover:underline px-2 py-2 -my-1">
                          Edit
                        </button>
                        <button onClick={() => cancelResourceRequest(r.id)}
                          className="text-xs text-coral hover:underline px-2 py-2 -my-1">
                          Cancel
                        </button>
                      </>
                    )}
                    {canEdit && r.status === "denied" && (
                      <button onClick={() => setEditingResource(r)}
                        className="text-xs text-cerulean hover:underline px-2 py-2 -my-1">
                        Edit & resubmit
                      </button>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-xs text-ink/60 mt-1.5 bg-sand/20 rounded-md px-2.5 py-1.5">
                      {r.notes}
                    </p>
                  )}
                  {r.status === "denied" && r.denial_reason && (
                    <p className="text-xs text-coral mt-1.5">Denied: {r.denial_reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Occurrences */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">
          Schedule ({activeOccs.length} {activeOccs.length === 1 ? "occurrence" : "occurrences"})
        </h2>
        <div className="card divide-y divide-ink/5">
          {visibleOccs.map((o) => (
            <div key={o.id} className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              <span className="font-medium w-28 sm:w-32 shrink-0">{fmtDay(new Date(o.starts_at))}</span>
              <span className="text-ink/50 whitespace-nowrap">{fmtTimeRange(new Date(o.starts_at), new Date(o.ends_at))}</span>
            </div>
          ))}
          {activeOccs.length > 6 && (
            <button onClick={() => setShowAllOccs(!showAllOccs)}
              className="px-4 py-2.5 text-sm text-cerulean hover:bg-ink/[0.02] w-full text-left">
              {showAllOccs ? "Show less" : `Show all ${activeOccs.length}`}
            </button>
          )}
        </div>
      </section>

      {/* Editors */}
      <EditorsPanel
        eventId={event.id}
        editors={editors}
        canEdit={canEdit}
        ownerId={event.created_by}
        ownerName={event.profiles?.full_name ?? event.profiles?.email ?? "Owner"}
      />

      {(showAdd || editingRequest) && (
        <AddSpaceModal
          event={event}
          occurrences={activeOccs}
          existingRequests={requests}
          spaces={spaces}
          buildings={buildings}
          editRequest={editingRequest ?? undefined}
          onClose={() => { setShowAdd(false); setEditingRequest(null); }}
        />
      )}

      {(showAddResource || editingResource) && (
        <AddResourceModal
          event={event}
          occurrences={activeOccs}
          existingRequests={resourceRequests}
          resources={resources}
          editRequest={editingResource ?? undefined}
          onClose={() => { setShowAddResource(false); setEditingResource(null); }}
        />
      )}
    </main>
  );
}

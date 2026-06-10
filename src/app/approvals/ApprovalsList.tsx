"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fmtRange } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";
import StatusBadge from "@/components/StatusBadge";

export default function ApprovalsList({ pending, recent }: { pending: any[]; recent: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, status: "approved" | "denied") {
    setBusy(id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("space_requests").update({
      status,
      decided_by: user!.id,
      decided_at: new Date().toISOString(),
      denial_reason: status === "denied" ? reason.trim() || null : null,
    }).eq("id", id);
    setBusy(null);
    setDenyingId(null);
    setReason("");
    router.refresh();
  }

  function RequestCard({ r, actions }: { r: any; actions: boolean }) {
    return (
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium">{r.spaces?.name}</span>
          <span className="text-xs text-ink/40">
            {r.spaces?.buildings?.name} · {r.spaces?.campuses?.name}
          </span>
          {!actions && <StatusBadge status={r.status} />}
        </div>
        <div className="text-sm text-ink/70 mt-1">
          <Link href={`/events/${r.events?.id}`} className="text-cerulean hover:underline">
            {r.events?.title}
          </Link>
          <span className="text-xs text-ink/50">
            {" — "}{fmtRange(new Date(r.events?.starts_at), new Date(r.events?.ends_at))}
            {" · "}{describeRecurrence(r.events?.rrule)}
            {" · "}{r.scope === "whole_event" ? "whole event" : "single date"}
          </span>
        </div>
        <div className="text-xs text-ink/50 mt-1.5 flex flex-wrap gap-x-4">
          <span>By {r.profiles?.full_name ?? r.profiles?.email}</span>
          {(r.tables_qty > 0 || r.chairs_qty > 0) && (
            <span>{r.tables_qty} tables · {r.chairs_qty} chairs{r.setup_style ? ` · ${r.setup_style}` : ""}</span>
          )}
          {r.tech_needed && <span className="text-cerulean">Tech: {r.tech_details || "yes"}</span>}
          {r.catering_needed && <span className="text-[#8a6320]">Catering: {r.catering_details || "yes"}</span>}
        </div>
        {r.setup_notes && (
          <p className="text-xs text-ink/60 mt-1.5 bg-sand/20 rounded-md px-2.5 py-1.5">
            {r.setup_notes}
          </p>
        )}
        {actions && (
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => decide(r.id, "approved")} disabled={busy === r.id}
              className="btn-primary text-sm py-1.5">
              {busy === r.id ? "…" : "Approve"}
            </button>
            {denyingId === r.id ? (
              <>
                <input autoFocus className="input flex-1 py-1.5 text-sm" placeholder="Reason (optional)"
                  value={reason} onChange={(e) => setReason(e.target.value)} />
                <button onClick={() => decide(r.id, "denied")} disabled={busy === r.id}
                  className="btn-danger text-sm py-1.5">Confirm deny</button>
                <button onClick={() => { setDenyingId(null); setReason(""); }}
                  className="text-xs text-ink/40 hover:text-ink">cancel</button>
              </>
            ) : (
              <button onClick={() => setDenyingId(r.id)} className="btn-secondary text-sm py-1.5">
                Deny
              </button>
            )}
          </div>
        )}
        {r.status === "denied" && r.denial_reason && (
          <p className="text-xs text-coral mt-1">Reason: {r.denial_reason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="card p-8 text-center text-ink/40">All caught up. 🌊</div>
        ) : (
          <div className="grid gap-2">
            {pending.map((r) => <RequestCard key={r.id} r={r} actions />)}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">
            Recent decisions
          </h2>
          <div className="grid gap-2">
            {recent.map((r) => <RequestCard key={r.id} r={r} actions={false} />)}
          </div>
        </section>
      )}
    </div>
  );
}

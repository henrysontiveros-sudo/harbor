"use client";

import { useState } from "react";
import { fmtDayFull } from "@/lib/dates";

const TYPE_LABEL: Record<string, string> = {
  bug: "Bug",
  suggestion: "Suggestion",
  improvement: "Improvement",
  other: "Other",
};
const TYPE_CLS: Record<string, string> = {
  bug: "bg-coral/15 text-coral",
  suggestion: "bg-cerulean/15 text-cerulean",
  improvement: "bg-sky/20 text-imperial",
  other: "bg-ink/8 text-ink/50",
};
const STATUS_CLS: Record<string, string> = {
  open: "bg-imperial/10 text-imperial",
  reviewed: "bg-cerulean/15 text-cerulean",
  resolved: "bg-[#A6CE3A22] text-[#5a7a10]",
  done: "bg-[#A6CE3A22] text-[#5a7a10]",
  dismissed: "bg-ink/8 text-ink/40",
};

export interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  description: string;
  user_name: string | null;
  user_email: string | null;
  status: string;
  created_at: string;
}

function isResolved(status: string) {
  return status === "resolved" || status === "done" || status === "dismissed";
}

export default function FeedbackClient({ initial }: { initial: FeedbackItem[] }) {
  const [items, setItems] = useState<FeedbackItem[]>(initial);
  const [showResolved, setShowResolved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const openCount = items.filter((f) => !isResolved(f.status)).length;
  const visible = showResolved ? items : items.filter((f) => !isResolved(f.status));

  async function setResolved(id: string, resolved: boolean) {
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/feedback/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: data.status } : f))
        );
      } else {
        setErr(data.error ?? "Couldn't update this item. Please try again.");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return <div className="card p-8 text-center text-ink/40">No feedback submitted yet.</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink/50">
          {openCount} open{openCount === 1 ? " item" : " items"}
        </p>
        <button
          onClick={() => setShowResolved((v) => !v)}
          className="text-xs font-medium text-cerulean hover:text-imperial transition-colors"
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      </div>

      {err && (
        <p className="text-sm text-coral mb-3">{err}</p>
      )}

      {visible.length === 0 ? (
        <div className="card p-8 text-center text-ink/40">
          All caught up — no open feedback.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((f) => {
            const resolved = isResolved(f.status);
            return (
              <div key={f.id} className={`card p-4 ${resolved ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`badge text-[11px] ${TYPE_CLS[f.type] ?? TYPE_CLS.other}`}>
                    {TYPE_LABEL[f.type] ?? "Other"}
                  </span>
                  <span className={`badge text-[11px] ${STATUS_CLS[f.status] ?? STATUS_CLS.open}`}>
                    {f.status}
                  </span>
                  <span className="text-xs text-ink/40 ml-auto">
                    {fmtDayFull(new Date(f.created_at))}
                  </span>
                </div>
                <h3 className="font-bold text-ink">{f.title}</h3>
                <p className="text-sm text-ink/70 mt-1 whitespace-pre-wrap">{f.description}</p>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <p className="text-xs text-ink/40">
                    {f.user_name || "Unknown"}{f.user_email ? ` · ${f.user_email}` : ""}
                  </p>
                  {resolved ? (
                    <button
                      onClick={() => setResolved(f.id, false)}
                      disabled={busyId === f.id}
                      className="text-xs font-medium text-ink/50 hover:text-imperial transition-colors disabled:opacity-50"
                    >
                      {busyId === f.id ? "…" : "Reopen"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setResolved(f.id, true)}
                      disabled={busyId === f.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md bg-imperial text-white hover:bg-imperial/80 transition-colors disabled:opacity-50"
                    >
                      {busyId === f.id ? "Saving…" : "Mark resolved"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

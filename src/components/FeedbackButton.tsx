"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

type FeedbackType = "bug" | "suggestion" | "improvement" | "other";

const TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: "bug",         label: "Bug Report",  emoji: "🐛" },
  { value: "suggestion",  label: "Suggestion",  emoji: "💡" },
  { value: "improvement", label: "Improvement", emoji: "⚡" },
  { value: "other",       label: "Other",       emoji: "💬" },
];

export default function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (pathname === "/login") return null;

  function handleClose() {
    setOpen(false);
    setTitle("");
    setDescription("");
    setType("suggestion");
    setDone(false);
    setErr(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
      setTimeout(handleClose, 1500);
    } catch {
      setErr("Couldn't submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Feedback pill — fixed bottom-right */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 print:hidden bg-cerulean text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md hover:bg-cerulean/80 transition-colors flex items-center gap-1.5 tracking-wide"
      >
        <span className="text-sm leading-none">💬</span>
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-imperial px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-base tracking-wide">Share Feedback</h2>
                <p className="text-white/50 text-[11px] mt-0.5 tracking-widest uppercase">
                  Harbor · Mariners Church
                </p>
              </div>
              <button onClick={handleClose} className="text-white/50 hover:text-white transition-colors text-xl leading-none">
                ×
              </button>
            </div>
            <div className="h-[3px] bg-cerulean" />

            {done ? (
              <div className="p-10 text-center">
                <p className="text-3xl mb-2">⚓</p>
                <p className="font-bold text-imperial">Feedback received — thank you!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPES.map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setType(value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          type === value
                            ? "border-imperial bg-imperial text-white shadow-sm"
                            : "border-ink/15 text-ink/60 hover:border-ink/30 bg-white"
                        }`}
                      >
                        <span className="text-base leading-none">{emoji}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary…"
                    maxLength={120}
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">
                    Details
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue or idea in detail…"
                    rows={4}
                    maxLength={1000}
                    required
                    className="input resize-none"
                  />
                  <p className="text-right text-xs text-ink/30 mt-1">{description.length}/1000</p>
                </div>

                {err && <p className="text-sm text-coral">{err}</p>}

                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !description.trim()}
                  className="w-full bg-cerulean text-white py-2.5 rounded-lg text-sm font-bold tracking-widest uppercase disabled:opacity-40 hover:bg-cerulean/90 transition-all"
                >
                  {submitting ? "Submitting…" : "Submit Feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditorsPanel({
  eventId, editors, canEdit, ownerId, ownerName,
}: {
  eventId: string;
  editors: { user_id: string; profiles: { id: string; full_name: string | null; email: string } | null }[];
  canEdit: boolean;
  ownerId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addEditor(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { data: person } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email.trim())
      .single();
    if (!person) {
      setErr("No staff member found with that email. They need to sign in to Harbor once first.");
      setBusy(false);
      return;
    }
    if (person.id === ownerId || editors.some((ed) => ed.user_id === person.id)) {
      setErr("They can already edit this event.");
      setBusy(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("event_editors").insert({
      event_id: eventId,
      user_id: person.id,
      added_by: user!.id,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEmail("");
    router.refresh();
  }

  async function removeEditor(userId: string) {
    await supabase.from("event_editors").delete()
      .eq("event_id", eventId).eq("user_id", userId);
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">Editors</h2>
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="badge bg-imperial/5 text-imperial">{ownerName} (owner)</span>
          {editors.map((ed) => (
            <span key={ed.user_id} className="badge bg-sky/15 text-imperial flex items-center gap-1.5">
              {ed.profiles?.full_name ?? ed.profiles?.email}
              {canEdit && (
                <button onClick={() => removeEditor(ed.user_id)}
                  className="text-ink/30 hover:text-coral leading-none">×</button>
              )}
            </span>
          ))}
          {editors.length === 0 && (
            <span className="text-xs text-ink/40 self-center">No additional editors.</span>
          )}
        </div>
        {canEdit && (
          <form onSubmit={addEditor} className="flex gap-2">
            <input type="email" required className="input flex-1" placeholder="coworker@marinerschurch.org"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" disabled={busy} className="btn-secondary whitespace-nowrap">
              {busy ? "Adding…" : "Add editor"}
            </button>
          </form>
        )}
        {err && <p className="text-sm text-coral">{err}</p>}
      </div>
    </section>
  );
}

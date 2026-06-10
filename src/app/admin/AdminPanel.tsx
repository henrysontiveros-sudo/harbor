"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Campus { id: string; name: string; slug: string; active: boolean }
interface Profile { id: string; email: string; full_name: string | null; role: string }

export default function AdminPanel({
  campuses, profiles, campusAdmins, isSuper,
}: {
  campuses: Campus[];
  profiles: Profile[];
  campusAdmins: { campus_id: string; user_id: string }[];
  isSuper: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const person = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
    if (!person) { setErr("No profile with that email — they need to sign in once first."); return; }
    setBusy(true);
    const { error } = await supabase.from("campus_admins").insert({
      campus_id: campusId, user_id: person.id,
    });
    if (!error && person.role === "staff") {
      await supabase.from("profiles").update({ role: "admin" }).eq("id", person.id);
    }
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEmail("");
    router.refresh();
  }

  async function removeAdmin(campus_id: string, user_id: string) {
    await supabase.from("campus_admins").delete()
      .eq("campus_id", campus_id).eq("user_id", user_id);
    // demote to staff if no remaining campuses and not super_admin
    const remaining = campusAdmins.filter(
      (ca) => ca.user_id === user_id && !(ca.campus_id === campus_id)
    );
    const p = profiles.find((x) => x.id === user_id);
    if (remaining.length === 0 && p?.role === "admin") {
      await supabase.from("profiles").update({ role: "staff" }).eq("id", user_id);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {isSuper && (
        <form onSubmit={addAdmin} className="card p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="label">Staff email</label>
            <input type="email" required className="input" placeholder="name@marinerschurch.org"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Campus</label>
            <select className="input" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
              {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Adding…" : "Make campus admin"}
          </button>
          {err && <p className="text-sm text-coral w-full">{err}</p>}
        </form>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {campuses.map((c) => {
          const admins = campusAdmins
            .filter((ca) => ca.campus_id === c.id)
            .map((ca) => profiles.find((p) => p.id === ca.user_id))
            .filter(Boolean) as Profile[];
          return (
            <div key={c.id} className="card p-4">
              <h3 className="font-bold text-imperial mb-2">{c.name}</h3>
              {admins.length === 0 ? (
                <p className="text-xs text-ink/40">No admins assigned.</p>
              ) : (
                <div className="space-y-1.5">
                  {admins.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span>{a.full_name ?? a.email}</span>
                      {isSuper && (
                        <button onClick={() => removeAdmin(c.id, a.id)}
                          className="text-xs text-coral hover:underline">remove</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card p-4">
        <h3 className="font-bold text-imperial mb-1">Staff directory</h3>
        <p className="text-xs text-ink/40 mb-3">{profiles.length} people have signed in.</p>
        <div className="max-h-72 overflow-y-auto divide-y divide-ink/5">
          {profiles.map((p) => (
            <div key={p.id} className="py-1.5 flex items-center justify-between text-sm">
              <span>{p.full_name ?? p.email}</span>
              <span className="badge bg-imperial/5 text-imperial">{p.role.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  facilities: boolean;
  created_at: string;
}

const ROLE_ORDER: UserRole[] = ["super_admin", "admin", "staff", "viewer"];

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: "bg-imperial text-white",
  admin: "bg-cerulean/15 text-cerulean",
  staff: "bg-sky/20 text-imperial",
  viewer: "bg-ink/8 text-ink/50",
};

const ROLE_HELP: Record<UserRole, string> = {
  viewer: "Can view schedules and spaces. Cannot create events or requests.",
  staff: "Can create events and submit space requests.",
  admin: "Staff abilities, plus approve/deny requests (assign congregations below).",
  super_admin: "Full access, including user management.",
};

const PROTECTED = ["hontiveros@marinerschurch.org", "henrysontiveros@gmail.com"];

export default function UsersClient({
  profiles,
  currentUserId,
}: {
  profiles: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? profiles.filter(
          (p) =>
            p.email.toLowerCase().includes(q) ||
            (p.full_name ?? "").toLowerCase().includes(q)
        )
      : profiles;
    return [...rows].sort(
      (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    );
  }, [profiles, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of profiles) c[p.role] = (c[p.role] ?? 0) + 1;
    return c;
  }, [profiles]);

  async function changeRole(id: string, role: UserRole) {
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to update role");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFacilities(id: string, facilities: boolean) {
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/facilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilities }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to update facilities access");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update facilities access");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Role summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ROLE_ORDER.slice().reverse().map((r) => (
          <div key={r} className="card px-3 py-2">
            <p className="text-lg font-black text-imperial">{counts[r] ?? 0}</p>
            <p className="text-xs text-ink/50">{ROLE_LABELS[r]}{(counts[r] ?? 0) === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input"
      />

      {err && <p className="text-sm text-coral">{err}</p>}

      <div className="card divide-y divide-ink/5">
        {filtered.map((p) => {
          const isProtected = PROTECTED.includes(p.email.toLowerCase());
          const isSelf = p.id === currentUserId;
          return (
            <div
              key={p.id}
              className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="min-w-0 sm:flex-1">
                <p className="font-medium text-ink truncate">
                  {p.full_name ?? p.email.split("@")[0]}
                  {isSelf && <span className="text-xs text-ink/40 font-normal"> (you)</span>}
                </p>
                <p className="text-xs text-ink/50 truncate">{p.email}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`badge ${ROLE_BADGE[p.role]} text-[11px]`}>
                  {ROLE_LABELS[p.role]}
                </span>
                {isProtected ? (
                  <span className="text-xs text-ink/30 italic">protected</span>
                ) : (
                  <select
                    value={p.role}
                    disabled={busyId === p.id}
                    onChange={(e) => changeRole(p.id, e.target.value as UserRole)}
                    className="text-sm border border-ink/15 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-imperial/30 disabled:opacity-50"
                    title={ROLE_HELP[p.role]}
                  >
                    {ROLE_ORDER.slice().reverse().map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                )}
                <label
                  className="flex items-center gap-1.5 text-xs text-ink/60 cursor-pointer select-none pl-1"
                  title="Grants access to the Setup Sheet (facilities run sheet), even without an admin role."
                >
                  <input
                    type="checkbox"
                    checked={p.facilities}
                    disabled={busyId === p.id}
                    onChange={(e) => toggleFacilities(p.id, e.target.checked)}
                    className="h-4 w-4 rounded border-ink/25 text-imperial focus:ring-imperial/30 disabled:opacity-50"
                  />
                  Facilities
                </label>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-ink/40 text-sm">No users match your search.</div>
        )}
      </div>

      <div className="card p-4 bg-ink/[0.02]">
        <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Role reference</p>
        <ul className="space-y-1.5 text-sm text-ink/70">
          {ROLE_ORDER.slice().reverse().map((r) => (
            <li key={r} className="flex gap-2">
              <span className={`badge ${ROLE_BADGE[r]} text-[10px] shrink-0 h-fit`}>{ROLE_LABELS[r]}</span>
              <span className="text-ink/60">{ROLE_HELP[r]}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink/40 mt-3">
          To grant a congregation admin their approval queue, assign them a congregation on the{" "}
          <a href="/admin" className="text-cerulean underline">Admin</a> page after setting their role to Admin.
        </p>
      </div>
    </div>
  );
}

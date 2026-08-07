"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";

interface Group {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
}
interface Member { group_id: string; user_id: string }
interface Profile { id: string; email: string; full_name: string | null; role: UserRole }

export default function GroupsClient({
  groups,
  members,
  profiles,
}: {
  groups: Group[];
  members: Member[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const profileById = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of profiles) m.set(p.id, p);
    return m;
  }, [profiles]);

  const membersByGroup = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const gm of members) {
      if (!m.has(gm.group_id)) m.set(gm.group_id, []);
      m.get(gm.group_id)!.push(gm.user_id);
    }
    return m;
  }, [members]);

  async function call(payload: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Request failed");
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const ok = await call({ action: "create_group", name: newName.trim(), description: newDesc.trim() || null });
    if (ok) { setNewName(""); setNewDesc(""); }
  }

  return (
    <div className="space-y-8">
      {/* Create */}
      <section className="card p-4">
        <h2 className="font-bold text-imperial mb-3">New group</h2>
        <form onSubmit={createGroup} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Group name (e.g. High School, Production)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy || !newName.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
            Create group
          </button>
        </form>
      </section>

      {err && <p className="text-sm text-coral">{err}</p>}

      {/* Groups list */}
      <section className="space-y-3">
        <h2 className="font-bold text-imperial">
          Groups <span className="text-ink/40 font-normal">({groups.length})</span>
        </h2>
        {groups.length === 0 ? (
          <div className="card p-8 text-center text-ink/40 text-sm">No groups yet. Create one above.</div>
        ) : (
          groups.map((g) => {
            const memberIds = membersByGroup.get(g.id) ?? [];
            const isOpen = expanded === g.id;
            return (
              <div key={g.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">
                      {g.name}
                      {!g.active && <span className="badge bg-ink/8 text-ink/40 text-[11px] ml-2">inactive</span>}
                    </p>
                    {g.description && <p className="text-xs text-ink/50 truncate">{g.description}</p>}
                    <p className="text-xs text-ink/40 mt-0.5">
                      {memberIds.length} member{memberIds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpanded(isOpen ? null : g.id)}
                      className="btn-secondary px-3 py-1.5 text-sm"
                    >
                      {isOpen ? "Done" : "Manage members"}
                    </button>
                    <button
                      onClick={() => call({ action: "update_group", id: g.id, active: !g.active })}
                      disabled={busy}
                      className="text-xs text-ink/50 hover:text-imperial disabled:opacity-50"
                    >
                      {g.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <MemberManager
                    group={g}
                    memberIds={memberIds}
                    profiles={profiles}
                    profileById={profileById}
                    busy={busy}
                    onAdd={(uid) => call({ action: "add_member", group_id: g.id, user_id: uid })}
                    onRemove={(uid) => call({ action: "remove_member", group_id: g.id, user_id: uid })}
                  />
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function MemberManager({
  group,
  memberIds,
  profiles,
  profileById,
  busy,
  onAdd,
  onRemove,
}: {
  group: Group;
  memberIds: string[];
  profiles: Profile[];
  profileById: Map<string, Profile>;
  busy: boolean;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const [q, setQ] = useState("");
  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  const candidates = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return profiles
      .filter((p) => !memberSet.has(p.id))
      .filter(
        (p) =>
          p.email.toLowerCase().includes(query) ||
          (p.full_name ?? "").toLowerCase().includes(query)
      )
      .slice(0, 6);
  }, [q, profiles, memberSet]);

  return (
    <div className="mt-4 pt-4 border-t border-ink/10 space-y-3">
      {/* Current members */}
      <div>
        <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Members</p>
        {memberIds.length === 0 ? (
          <p className="text-sm text-ink/40">No one assigned yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {memberIds.map((uid) => {
              const p = profileById.get(uid);
              return (
                <span key={uid} className="badge bg-imperial/8 text-imperial text-xs flex items-center gap-1.5 py-1 pl-2 pr-1">
                  {p?.full_name ?? p?.email ?? uid}
                  <button
                    onClick={() => onRemove(uid)}
                    disabled={busy}
                    className="hover:bg-imperial/15 rounded w-4 h-4 flex items-center justify-center disabled:opacity-50"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Add member */}
      <div>
        <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Add someone to {group.name}</p>
        <input
          className="input"
          placeholder="Search staff by name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {candidates.length > 0 && (
          <div className="mt-2 border border-ink/10 rounded-lg divide-y divide-ink/5 overflow-hidden">
            {candidates.map((p) => (
              <button
                key={p.id}
                onClick={() => { onAdd(p.id); setQ(""); }}
                disabled={busy}
                className="w-full text-left px-3 py-2 hover:bg-imperial/5 disabled:opacity-50 flex items-center justify-between gap-2"
              >
                <span className="min-w-0">
                  <span className="text-sm text-ink truncate block">{p.full_name ?? p.email.split("@")[0]}</span>
                  <span className="text-xs text-ink/50 truncate block">{p.email}</span>
                </span>
                <span className="text-xs text-cerulean shrink-0">+ Add</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BypassCode {
  id: string;
  code: string;
  label: string | null;
  issued_by_email: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

interface BypassUse {
  id: string;
  code_text: string;
  used_by_email: string | null;
  detail: {
    event_title?: string | null;
    space_name?: string | null;
    building?: string | null;
    campus?: string | null;
    when?: string | null;
  } | null;
  created_at: string;
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(iso));
}

export default function BypassClient({
  initialCodes, initialUses,
}: { initialCodes: BypassCode[]; initialUses: BypassUse[] }) {
  const router = useRouter();
  const [codes, setCodes] = useState(initialCodes);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true); setJustCreated(null);
    const res = await fetch("/api/admin/bypass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim() || null,
        max_uses: maxUses === "" ? null : parseInt(maxUses),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? "Failed to issue code."); return; }
    setCodes([json.code, ...codes]);
    setJustCreated(json.code.code);
    setLabel(""); setMaxUses(""); setExpiresAt("");
  }

  async function toggle(id: string, active: boolean) {
    const res = await fetch("/api/admin/bypass", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    if (res.ok) {
      setCodes(codes.map((c) => (c.id === id ? { ...c, active } : c)));
    }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  }

  function codeState(c: BypassCode): { label: string; cls: string } {
    if (!c.active) return { label: "Inactive", cls: "bg-ink/10 text-ink/50" };
    if (c.expires_at && new Date(c.expires_at) < new Date())
      return { label: "Expired", cls: "bg-coral/15 text-coral" };
    if (c.max_uses != null && c.use_count >= c.max_uses)
      return { label: "Used up", cls: "bg-coral/15 text-coral" };
    return { label: "Active", cls: "bg-radiant/15 text-[#5a7a10]" };
  }

  return (
    <div className="space-y-10">
      {/* ── TOP HALF: issue + manage codes ── */}
      <section>
        <h2 className="text-lg font-bold text-imperial mb-3">Issue a code</h2>
        <form onSubmit={issue} className="card p-4 sm:p-5 grid sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="label">Label — who / what it&apos;s for</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Pastor Dave — Sunday setup" />
          </div>
          <div>
            <label className="label">Max uses</label>
            <input type="number" min={1} className="input" value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)} placeholder="∞" />
          </div>
          <div>
            <label className="label">Expires</label>
            <input type="datetime-local" className="input" value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="sm:col-span-4 flex items-center justify-between gap-3">
            {err && <p className="text-sm text-coral">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary py-2.5 sm:py-2 ml-auto">
              {busy ? "Issuing…" : "Issue bypass code"}
            </button>
          </div>
        </form>

        {justCreated && (
          <div className="mt-3 rounded-lg bg-radiant/10 border border-radiant/30 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-ink/50 uppercase tracking-wide">New code</p>
              <p className="text-xl font-black font-mono text-imperial tracking-wider">{justCreated}</p>
            </div>
            <button onClick={() => copy(justCreated)} className="btn-secondary py-2">
              {copied === justCreated ? "Copied ✓" : "Copy"}
            </button>
          </div>
        )}

        <h3 className="text-sm font-bold text-ink/60 uppercase tracking-wide mt-6 mb-2">All codes</h3>
        <div className="card divide-y divide-ink/5">
          {codes.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink/40 text-center">No bypass codes yet.</p>
          )}
          {codes.map((c) => {
            const st = codeState(c);
            return (
              <div key={c.id} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <button onClick={() => copy(c.code)}
                  className="font-mono font-bold text-imperial tracking-wider hover:underline">
                  {copied === c.code ? "Copied ✓" : c.code}
                </button>
                <span className={`badge px-2 py-0.5 text-[11px] ${st.cls}`}>{st.label}</span>
                <span className="text-sm text-ink/60 flex-1 min-w-[120px]">{c.label ?? <span className="text-ink/30">No label</span>}</span>
                <span className="text-xs text-ink/40">
                  {c.use_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""} use{c.use_count === 1 ? "" : "s"}
                  {c.expires_at ? ` · exp ${fmtDateTime(c.expires_at)}` : ""}
                </span>
                <button onClick={() => toggle(c.id, !c.active)}
                  className="text-xs font-semibold text-cerulean hover:underline">
                  {c.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── BOTTOM HALF: usage log ── */}
      <section>
        <h2 className="text-lg font-bold text-imperial mb-1">Usage log</h2>
        <p className="text-sm text-ink/50 mb-3">Every time a bypass code is used to approve a within-48h booking.</p>
        <div className="card divide-y divide-ink/5">
          {initialUses.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink/40 text-center">No bypass codes have been used yet.</p>
          )}
          {initialUses.map((u) => (
            <div key={u.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="font-mono font-bold text-imperial text-sm tracking-wide">{u.code_text}</span>
                <span className="text-sm text-ink/70">{u.detail?.event_title ?? "Event"}</span>
                <span className="text-xs text-ink/40 ml-auto">{fmtDateTime(u.created_at)}</span>
              </div>
              <p className="text-xs text-ink/50 mt-0.5">
                {u.detail?.space_name ?? "Space"}
                {u.detail?.building ? ` — ${u.detail.building}` : ""}
                {u.detail?.campus ? `, ${u.detail.campus}` : ""}
                {u.detail?.when ? ` · ${u.detail.when}` : ""}
              </p>
              <p className="text-xs text-ink/35 mt-0.5">Used by {u.used_by_email ?? "unknown"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

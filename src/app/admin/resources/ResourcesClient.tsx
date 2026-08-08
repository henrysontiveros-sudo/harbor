"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResourcesClient({
  resources, campuses,
}: {
  resources: any[];
  campuses: any[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // add form
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"equipment" | "vehicle">("equipment");
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [qty, setQty] = useState<string>("");
  const [billable, setBillable] = useState(false);

  const campusName = useMemo(() => {
    const m = new Map(campuses.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "All congregations");
  }, [campuses]);

  async function call(payload: any) {
    setBusy(true); setErr(null);
    const res = await fetch("/api/admin/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? "Something went wrong"); return false; }
    router.refresh();
    return true;
  }

  async function addResource() {
    if (!name.trim()) { setErr("Name is required"); return; }
    const ok = await call({
      action: "create_resource",
      name: name.trim(),
      category,
      campus_id: category === "vehicle" ? null : campusId,
      qty_on_hand: category === "vehicle" ? null : (qty === "" ? null : qty),
      is_billable: billable,
    });
    if (ok) { setName(""); setQty(""); setBillable(false); setShowAdd(false); }
  }

  const vehicles = resources.filter((r) => r.category === "vehicle");
  const equipment = resources.filter((r) => r.category === "equipment");

  // group equipment by congregation
  const eqByCampus = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of equipment) {
      const key = r.campus_id ?? "none";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return m;
  }, [equipment]);

  function Row({ r }: { r: any }) {
    const [editing, setEditing] = useState(false);
    const [eQty, setEQty] = useState<string>(r.qty_on_hand ?? "");
    const [eBill, setEBill] = useState<boolean>(r.is_billable);
    return (
      <div className={`px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 ${!r.active ? "opacity-50" : ""}`}>
        <span className="font-medium">{r.name}</span>
        {r.category === "equipment" && (
          editing ? (
            <input type="number" min={0} className="input w-24 py-1 text-sm" value={eQty}
              onChange={(e) => setEQty(e.target.value)} placeholder="qty" />
          ) : (
            r.qty_on_hand != null && <span className="text-xs text-ink/50">{r.qty_on_hand} on hand</span>
          )
        )}
        {editing ? (
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            <input type="checkbox" checked={eBill} onChange={(e) => setEBill(e.target.checked)} className="w-4 h-4 accent-cerulean" />
            Billable
          </label>
        ) : (
          r.is_billable && <span className="badge bg-[#8a6320]/10 text-[#8a6320]">Billable</span>
        )}
        {!r.active && <span className="badge bg-ink/10 text-ink/40">Inactive</span>}
        <span className="flex-1" />
        {editing ? (
          <>
            <button disabled={busy} onClick={async () => {
              const ok = await call({
                action: "update_resource", id: r.id,
                qty_on_hand: r.category === "equipment" ? (eQty === "" ? null : eQty) : undefined,
                is_billable: eBill,
              });
              if (ok) setEditing(false);
            }} className="text-xs text-cerulean hover:underline px-2 py-1">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-ink/40 hover:text-ink px-2 py-1">cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="text-xs text-cerulean hover:underline px-2 py-1">Edit</button>
            <button disabled={busy} onClick={() => call({ action: "update_resource", id: r.id, active: !r.active })}
              className="text-xs text-ink/50 hover:text-ink px-2 py-1">
              {r.active ? "Deactivate" : "Reactivate"}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {err && <p className="text-sm text-coral">{err}</p>}

      <div>
        {showAdd ? (
          <div className="card p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Round Tables, Van #7" />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                  <option value="equipment">Equipment (per congregation)</option>
                  <option value="vehicle">Vehicle (fleet-wide)</option>
                </select>
              </div>
              {category === "equipment" && (
                <>
                  <div>
                    <label className="label">Congregation</label>
                    <select className="input" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
                      {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Quantity on hand</label>
                    <input type="number" min={0} className="input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="optional" />
                  </div>
                </>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} className="w-4 h-4 accent-cerulean" />
              Billable
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm py-1.5">Cancel</button>
              <button onClick={addResource} disabled={busy} className="btn-primary text-sm py-1.5">Add resource</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add resource</button>
        )}
      </div>

      {/* Equipment by congregation */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">Equipment ({equipment.length})</h2>
        <div className="space-y-4">
          {[...eqByCampus.entries()].map(([campusId, items]) => (
            <div key={campusId}>
              <p className="text-xs font-bold text-imperial mb-1">{campusName(campusId === "none" ? null : campusId)}</p>
              <div className="card divide-y divide-ink/5">
                {items.map((r) => <Row key={r.id} r={r} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vehicles */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-2">Vehicles ({vehicles.length}) · fleet-wide</h2>
        <div className="card divide-y divide-ink/5">
          {vehicles.map((r) => <Row key={r.id} r={r} />)}
        </div>
      </section>
    </div>
  );
}

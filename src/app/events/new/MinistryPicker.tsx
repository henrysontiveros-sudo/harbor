"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Group { id: string; name: string; color: string | null; parent_id: string | null }
interface Parent { id: string; name: string }

/**
 * Ministry picker with brand color swatches and parent/child nesting.
 * A native <select> can't render colored option rows, so this is a custom
 * dropdown. Parents that have selectable children render as non-clickable
 * group headers; children are indented under them. Top-level ministries (no
 * parent) render as normal selectable rows.
 */
export default function MinistryPicker({
  groups, parents, value, onChange, allowNone,
}: {
  groups: Group[];
  parents: Parent[];
  value: string;
  onChange: (id: string) => void;
  allowNone: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const parentName = useMemo(() => {
    const m = new Map(parents.map((p) => [p.id, p.name]));
    return (id: string | null) => (id ? m.get(id) ?? null : null);
  }, [parents]);

  // Build display structure: which parent_ids are actually present among the
  // selectable groups, so we only show headers that have children the user can pick.
  // Everything is ordered alphabetically: parent headers by name, children within
  // each parent by name, and standalone ministries by name.
  const { standalone, byParent, parentOrder } = useMemo(() => {
    const byName = (a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    const standalone: Group[] = [];
    const byParent = new Map<string, Group[]>();
    for (const g of groups) {
      if (g.parent_id && parentName(g.parent_id)) {
        if (!byParent.has(g.parent_id)) byParent.set(g.parent_id, []);
        byParent.get(g.parent_id)!.push(g);
      } else {
        standalone.push(g);
      }
    }
    standalone.sort(byName);
    for (const list of byParent.values()) list.sort(byName);
    // parent headers alphabetical by name (only those that have selectable children)
    const parentOrder = parents
      .filter((p) => byParent.has(p.id))
      .slice()
      .sort(byName)
      .map((p) => p.id);
    return { standalone, byParent, parentOrder };
  }, [groups, parents, parentName]);

  const selected = groups.find((g) => g.id === value) ?? null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center gap-2 text-left w-full"
      >
        {selected ? (
          <>
            <span className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: selected.color ?? "#94a3b8" }} />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-ink/40">{allowNone ? "— General (no specific group) —" : "Choose a ministry…"}</span>
        )}
        <span className="flex-1" />
        <span className="text-ink/30 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-ink/15 bg-white shadow-lg py-1">
          {allowNone && (
            <button type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-ink/[0.04] text-ink/60">
              — General (no specific group) —
            </button>
          )}

          {/* Nested groups first */}
          {parentOrder.map((pid) => (
            <div key={pid}>
              <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">
                {parentName(pid)}
              </div>
              {byParent.get(pid)!.map((g) => (
                <Row key={g.id} g={g} selected={g.id === value} indent
                  onPick={() => { onChange(g.id); setOpen(false); }} />
              ))}
            </div>
          ))}

          {/* Standalone (top-level) ministries */}
          {standalone.map((g) => (
            <Row key={g.id} g={g} selected={g.id === value}
              onPick={() => { onChange(g.id); setOpen(false); }} />
          ))}

          {standalone.length === 0 && parentOrder.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink/40">No ministries available.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ g, selected, indent, onPick }: { g: Group; selected: boolean; indent?: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-ink/[0.04] ${selected ? "bg-cerulean/5 font-semibold" : ""} ${indent ? "pl-7" : ""}`}>
      <span className="inline-block w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: g.color ?? "#94a3b8" }} />
      <span className="truncate">{g.name}</span>
      {selected && <span className="ml-auto text-cerulean text-xs">✓</span>}
    </button>
  );
}

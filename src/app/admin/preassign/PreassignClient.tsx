"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

interface ExistingRow {
  id: string;
  email: string;
  role: UserRole;
  facilities: boolean;
  note: string | null;
  created_at: string;
  applied_at: string | null;
}

interface ParsedRow {
  email: string;
  role: string;
  facilities: boolean;
  note: string;
  valid: boolean;
  reason?: string;
}

const ALLOWED_DOMAINS = ["marinerschurch.org", "inov8-socal.tech"];
const VALID_ROLES: UserRole[] = ["viewer", "staff", "admin", "super_admin"];

const EXAMPLE_CSV = `email,role,facilities,note
jane.doe@marinerschurch.org,staff,false,Worship team lead
mark.lee@marinerschurch.org,admin,false,Irvine approver
casey.ops@marinerschurch.org,staff,true,Facilities crew
pat.smith@inov8-socal.tech,viewer,false,`;

// Minimal CSV parser: handles quoted fields + commas inside quotes.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export default function PreassignClient({
  existing,
  isSuper,
}: {
  existing: ExistingRow[];
  isSuper: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ upserted: number; skipped: number; errors: { line: number; email: string; reason: string }[] } | null>(null);

  const parsed = useMemo<ParsedRow[]>(() => {
    const text = raw.trim();
    if (!text) return [];
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) return [];
    // Detect + skip a header row
    const first = parseCsvLine(lines[0]).map((c) => c.trim().toLowerCase());
    const hasHeader = first.includes("email");
    const headers = hasHeader ? first : ["email", "role", "facilities", "note"];
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const idx = {
      email: headers.indexOf("email"),
      role: headers.indexOf("role"),
      facilities: headers.indexOf("facilities"),
      note: headers.indexOf("note"),
    };
    const seen = new Set<string>();
    return dataLines.map((line) => {
      const cells = parseCsvLine(line);
      const email = (idx.email >= 0 ? cells[idx.email] ?? "" : cells[0] ?? "").trim().toLowerCase();
      const roleRaw = (idx.role >= 0 ? cells[idx.role] ?? "" : cells[1] ?? "").trim().toLowerCase() || "viewer";
      const facRaw = (idx.facilities >= 0 ? cells[idx.facilities] ?? "" : cells[2] ?? "").trim().toLowerCase();
      const note = (idx.note >= 0 ? cells[idx.note] ?? "" : cells[3] ?? "").trim();
      const facilities = ["true", "yes", "y", "1"].includes(facRaw);

      let valid = true;
      let reason: string | undefined;
      if (!email) { valid = false; reason = "Missing email"; }
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { valid = false; reason = "Invalid email"; }
      else if (!ALLOWED_DOMAINS.includes(email.split("@")[1])) { valid = false; reason = "Domain not allowed"; }
      else if (seen.has(email)) { valid = false; reason = "Duplicate in file"; }
      else if (!VALID_ROLES.includes(roleRaw as UserRole)) { valid = false; reason = `Unknown role "${roleRaw}"`; }
      else if (roleRaw === "super_admin" && !isSuper) { valid = false; reason = "Super admin only a super admin can assign"; }
      if (valid) seen.add(email);

      return { email, role: roleRaw, facilities, note, valid, reason };
    });
  }, [raw, isSuper]);

  const validCount = parsed.filter((p) => p.valid).length;
  const invalidCount = parsed.length - validCount;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function downloadExample() {
    const blob = new Blob([EXAMPLE_CSV + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "harbor-preassign-example.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const rows = parsed
        .filter((p) => p.valid)
        .map((p) => ({ email: p.email, role: p.role, facilities: p.facilities, note: p.note }));
      if (rows.length === 0) throw new Error("No valid rows to upload.");
      const res = await fetch("/api/admin/preassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Upload failed");
      setResult({ upserted: d.upserted ?? 0, skipped: d.skipped ?? 0, errors: d.errors ?? [] });
      setRaw("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/preassign?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Delete failed");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* CSV format guide */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-imperial">CSV format</h2>
          <button onClick={downloadExample} className="btn-secondary px-3 py-1.5 text-sm">
            Download example CSV
          </button>
        </div>
        <p className="text-sm text-ink/60 mb-3">
          Columns: <code className="text-imperial">email</code>,{" "}
          <code className="text-imperial">role</code>,{" "}
          <code className="text-imperial">facilities</code>,{" "}
          <code className="text-imperial">note</code>. A header row is optional.
        </p>
        <ul className="text-xs text-ink/60 space-y-1 mb-3 list-disc pl-5">
          <li><strong>email</strong> — required; must be a <code>@marinerschurch.org</code> or <code>@inov8-socal.tech</code> address.</li>
          <li><strong>role</strong> — one of <code>viewer</code>, <code>staff</code>, <code>admin</code>{isSuper ? <>, <code>super_admin</code></> : <> (super_admin can only be set by a super admin)</>}. Defaults to <code>viewer</code>.</li>
          <li><strong>facilities</strong> — <code>true</code> or <code>false</code>; grants Setup Sheet access. Defaults to <code>false</code>.</li>
          <li><strong>note</strong> — optional free text (e.g. their ministry or role).</li>
        </ul>
        <pre className="text-xs bg-ink/[0.03] border border-ink/10 rounded-lg p-3 overflow-x-auto text-ink/70 leading-relaxed">{EXAMPLE_CSV}</pre>
      </section>

      {/* Upload */}
      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-imperial">Upload</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block text-sm text-ink/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-imperial file:text-white file:text-sm file:cursor-pointer"
        />
        <p className="text-xs text-ink/40">— or paste CSV below —</p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={5}
          placeholder={EXAMPLE_CSV}
          className="input font-mono text-xs"
        />

        {parsed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-ink/60">
              <span className="font-semibold text-imperial">{validCount}</span> valid
              {invalidCount > 0 && <> · <span className="font-semibold text-coral">{invalidCount}</span> will be skipped</>}
            </p>
            <div className="border border-ink/10 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink/[0.03] sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-ink/50 text-xs">Email</th>
                    <th className="text-left px-3 py-2 font-semibold text-ink/50 text-xs">Role</th>
                    <th className="text-left px-3 py-2 font-semibold text-ink/50 text-xs">Facilities</th>
                    <th className="text-left px-3 py-2 font-semibold text-ink/50 text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {parsed.map((p, i) => (
                    <tr key={i} className={p.valid ? "" : "bg-coral/5"}>
                      <td className="px-3 py-1.5 text-ink/80 truncate max-w-[200px]">{p.email || <span className="text-ink/30">—</span>}</td>
                      <td className="px-3 py-1.5 text-ink/70">{p.role}</td>
                      <td className="px-3 py-1.5 text-ink/70">{p.facilities ? "Yes" : "—"}</td>
                      <td className="px-3 py-1.5 text-xs">
                        {p.valid ? <span className="text-green-700">✓ ready</span> : <span className="text-coral">{p.reason}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {err && <p className="text-sm text-coral">{err}</p>}
        {result && (
          <div className="text-sm rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-green-800">
            Saved {result.upserted} pre-assignment{result.upserted === 1 ? "" : "s"}.
            {result.skipped > 0 && ` Skipped ${result.skipped}.`}
          </div>
        )}

        <button
          onClick={upload}
          disabled={busy || validCount === 0}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "Uploading…" : `Upload ${validCount} ${validCount === 1 ? "person" : "people"}`}
        </button>
      </section>

      {/* Existing pre-assignments */}
      <section>
        <h2 className="font-bold text-imperial mb-3">
          Staged pre-assignments <span className="text-ink/40 font-normal">({existing.length})</span>
        </h2>
        {existing.length === 0 ? (
          <div className="card p-8 text-center text-ink/40 text-sm">No pre-assignments yet. Upload a CSV above.</div>
        ) : (
          <div className="card divide-y divide-ink/5">
            {existing.map((r) => (
              <div key={r.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="min-w-0 sm:flex-1">
                  <p className="font-medium text-ink truncate">{r.email}</p>
                  {r.note && <p className="text-xs text-ink/40 truncate">{r.note}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="badge bg-ink/8 text-ink/60 text-[11px]">{ROLE_LABELS[r.role]}</span>
                  {r.facilities && <span className="badge bg-cerulean/15 text-cerulean text-[11px]">Facilities</span>}
                  {r.applied_at ? (
                    <span className="text-xs text-green-700" title={`Signed in ${new Date(r.applied_at).toLocaleString()}`}>✓ signed in</span>
                  ) : (
                    <span className="text-xs text-ink/40">pending sign-in</span>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busy}
                    className="text-xs text-coral hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

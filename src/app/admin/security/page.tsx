import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  not_found: "404 / dead link",
  unauthorized: "Unauthenticated access attempt",
  forbidden_domain: "Blocked non-org sign-in",
};

const KIND_STYLES: Record<string, string> = {
  not_found: "bg-ink/10 text-ink/60",
  unauthorized: "bg-amber-100 text-amber-800",
  forbidden_domain: "bg-coral/15 text-coral",
};

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(iso));
}

interface SecurityRow {
  id: string;
  created_at: string;
  kind: string;
  path: string | null;
  user_email: string | null;
  ip: string | null;
  user_agent: string | null;
  detail: Record<string, unknown> | null;
}

export default async function SecurityLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "super_admin") redirect("/admin");

  const { data: rows } = await supabase
    .from("security_log")
    .select("id, created_at, kind, path, user_email, ip, user_agent, detail")
    .order("created_at", { ascending: false })
    .limit(300);

  const list = (rows ?? []) as SecurityRow[];
  const counts = list.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">Security Log</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-1">Security Log</h1>
        <p className="text-sm text-ink/50 mb-6">
          Dead-link 404s and unauthorized access attempts. Internal — super admins only. Showing the most recent 300.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {Object.keys(KIND_LABELS).map((k) => (
            <span key={k} className={`text-xs px-2.5 py-1 rounded-full font-medium ${KIND_STYLES[k]}`}>
              {KIND_LABELS[k]}: {counts[k] ?? 0}
            </span>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="card p-8 text-center text-ink/40">Nothing logged yet.</div>
        ) : (
          <div className="card divide-y divide-ink/5">
            {list.map((r) => (
              <div key={r.id} className="px-4 py-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-ink/40 w-28 shrink-0 mt-0.5">{when(r.created_at)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${KIND_STYLES[r.kind] ?? "bg-ink/10 text-ink/60"}`}>
                        {KIND_LABELS[r.kind] ?? r.kind}
                      </span>
                      {r.path && <span className="font-mono text-xs text-ink/70 break-all">{r.path}</span>}
                    </div>
                    <div className="text-xs text-ink/45 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{r.user_email ?? "anonymous"}</span>
                      {r.ip && <span>IP {r.ip}</span>}
                      {r.detail?.domain != null && <span>domain @{String(r.detail.domain)}</span>}
                      {r.user_agent && <span className="truncate max-w-[18rem]" title={r.user_agent}>{r.user_agent}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

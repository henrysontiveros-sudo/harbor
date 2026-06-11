import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ROLE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d);
}

function describe(row: { action: string; actor_email: string | null; detail: Record<string, unknown> | null }): string {
  const d = row.detail ?? {};
  if (row.action === "role_change") {
    const from = ROLE_LABELS[d.from as keyof typeof ROLE_LABELS] ?? d.from;
    const to = ROLE_LABELS[d.to as keyof typeof ROLE_LABELS] ?? d.to;
    return `changed ${d.email}'s role from ${from} to ${to}`;
  }
  return row.action.replace(/_/g, " ");
}

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin" && me?.role !== "super_admin") redirect("/admin");

  const { data: rows } = await supabase
    .from("audit_log")
    .select("id, actor_email, action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">Activity Log</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-1">Activity Log</h1>
        <p className="text-sm text-ink/50 mb-6">Administrative actions, most recent first.</p>

        {(rows ?? []).length === 0 ? (
          <div className="card p-8 text-center text-ink/40">No activity recorded yet.</div>
        ) : (
          <div className="card divide-y divide-ink/5">
            {rows!.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-start gap-3 text-sm">
                <span className="text-xs text-ink/40 w-28 shrink-0 mt-0.5">{timeAgo(r.created_at)}</span>
                <span className="text-ink/80">
                  <span className="font-medium">{r.actor_email ?? "System"}</span>{" "}
                  {describe(r)}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

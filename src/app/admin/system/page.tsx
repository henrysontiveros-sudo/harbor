import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CURRENT_VERSION, CHANGELOG } from "@/lib/version";

export const dynamic = "force-dynamic";

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm border-b border-ink/5 last:border-0">
      <span className="text-ink/50">{label}</span>
      <span className={`font-mono text-xs ${ok === undefined ? "text-ink/80" : ok ? "text-[#5a7a10]" : "text-coral"}`}>
        {value}
      </span>
    </div>
  );
}

export default async function SystemPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "super_admin") redirect("/admin");

  // DB health counts
  const [
    { count: profileCount },
    { count: eventCount },
    { count: requestCount },
    { count: spaceCount },
    { count: campusCount },
    { count: auditCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("space_requests").select("*", { count: "exact", head: true }),
    supabase.from("spaces").select("*", { count: "exact", head: true }),
    supabase.from("campuses").select("*", { count: "exact", head: true }),
    supabase.from("audit_log").select("*", { count: "exact", head: true }),
  ]);

  // Env health (presence only — never expose values)
  const env = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    resendKey: !!process.env.RESEND_API_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "(default)",
    googleAuth: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
  };

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">System</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-1">System &amp; Diagnostics</h1>
        <p className="text-sm text-ink/50 mb-6">Internal — super admins only.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Build */}
          <div className="card p-4">
            <h3 className="font-bold text-imperial mb-2 text-sm uppercase tracking-wide">Build</h3>
            <Row label="Version" value={`v${CURRENT_VERSION}`} />
            <Row label="Changelog entries" value={String(CHANGELOG.length)} />
            <Row label="Environment" value={process.env.NODE_ENV ?? "unknown"} />
          </div>

          {/* Env health */}
          <div className="card p-4">
            <h3 className="font-bold text-imperial mb-2 text-sm uppercase tracking-wide">Configuration</h3>
            <Row label="Supabase URL" value={env.supabaseUrl ? "set" : "missing"} ok={env.supabaseUrl} />
            <Row label="Anon key" value={env.anonKey ? "set" : "missing"} ok={env.anonKey} />
            <Row label="Service role key" value={env.serviceKey ? "set" : "missing"} ok={env.serviceKey} />
            <Row label="Resend key" value={env.resendKey ? "set" : "missing"} ok={env.resendKey} />
            <Row label="Google auth" value={env.googleAuth ? "enabled" : "disabled"} ok={env.googleAuth} />
            <Row label="App URL" value={env.appUrl} />
          </div>

          {/* DB counts */}
          <div className="card p-4 sm:col-span-2">
            <h3 className="font-bold text-imperial mb-2 text-sm uppercase tracking-wide">Database</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <Row label="Profiles" value={String(profileCount ?? 0)} />
              <Row label="Events" value={String(eventCount ?? 0)} />
              <Row label="Space requests" value={String(requestCount ?? 0)} />
              <Row label="Spaces" value={String(spaceCount ?? 0)} />
              <Row label="Campuses" value={String(campusCount ?? 0)} />
              <Row label="Audit entries" value={String(auditCount ?? 0)} />
            </div>
          </div>

          {/* Full changelog / dev log */}
          <div className="card p-4 sm:col-span-2">
            <h3 className="font-bold text-imperial mb-3 text-sm uppercase tracking-wide">Developer Changelog</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {[...CHANGELOG].reverse().map((entry) => (
                <div key={entry.version}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-imperial text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest">
                      v{entry.version}
                    </span>
                    <span className="text-ink/40 text-xs">{entry.date}</span>
                  </div>
                  <ul className="pl-3 space-y-1">
                    {entry.changes.map((c, i) => (
                      <li key={i} className="text-xs text-ink/60">
                        <span className="text-ink/35 uppercase tracking-wide mr-1.5">[{c.type}]</span>
                        {c.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BypassClient from "./BypassClient";

export const dynamic = "force-dynamic";

export default async function BypassPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  if (!me || !["admin", "super_admin"].includes(me.role)) redirect("/admin");

  const [{ data: codes }, { data: uses }] = await Promise.all([
    supabase.from("bypass_codes").select("*").order("created_at", { ascending: false }),
    supabase.from("bypass_code_uses").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">Bypass Codes</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-1">Bypass Codes</h1>
        <p className="text-sm text-ink/50 mb-6 max-w-2xl">
          Harbor blocks any booking that starts within 48 hours. A bypass code is an on-call
          admin override — it approves a request instantly, regardless of space, time, or
          conflicts. Every use is logged below and emailed to the admin who issued the code.
        </p>

        <BypassClient initialCodes={codes ?? []} initialUses={uses ?? []} />
      </main>
    </>
  );
}

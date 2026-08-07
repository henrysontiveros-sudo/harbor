import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PreassignClient from "./PreassignClient";

export const dynamic = "force-dynamic";

export default async function PreassignPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/preassign");

  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin" && me?.role !== "super_admin") redirect("/admin");

  const { data: rows } = await supabase
    .from("preassigned_users")
    .select("id, email, role, facilities, note, created_at, applied_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">Bulk Pre-assign</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-1">Bulk Pre-assign People</h1>
        <p className="text-sm text-ink/50 mb-6">
          Upload a CSV to stage people&apos;s roles and Facilities access before they sign in. When
          each person first signs in with Google, their access is applied automatically — no setup
          at sign-in.
        </p>
        <PreassignClient
          existing={rows ?? []}
          isSuper={me?.role === "super_admin"}
        />
      </main>
    </>
  );
}

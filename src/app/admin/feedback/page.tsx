import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FeedbackClient, { type FeedbackItem } from "./FeedbackClient";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin" && me?.role !== "super_admin") redirect("/admin");

  const { data: items } = await supabase
    .from("feedback")
    .select("id, type, title, description, user_name, user_email, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-ink/50 mb-1">
          <Link href="/admin" className="hover:text-imperial">Admin</Link>
          <span>/</span>
          <span className="text-ink/70">Feedback</span>
        </div>
        <h1 className="text-2xl font-black text-imperial mb-6">Feedback</h1>
        <FeedbackClient initial={(items ?? []) as FeedbackItem[]} />
      </main>
    </>
  );
}

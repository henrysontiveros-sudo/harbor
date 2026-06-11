import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fmtDayFull } from "@/lib/dates";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  bug: "Bug",
  suggestion: "Suggestion",
  improvement: "Improvement",
  other: "Other",
};
const TYPE_CLS: Record<string, string> = {
  bug: "bg-coral/15 text-coral",
  suggestion: "bg-cerulean/15 text-cerulean",
  improvement: "bg-sky/20 text-imperial",
  other: "bg-ink/8 text-ink/50",
};
const STATUS_CLS: Record<string, string> = {
  open: "bg-imperial/10 text-imperial",
  reviewed: "bg-cerulean/15 text-cerulean",
  done: "bg-[#A6CE3A22] text-[#5a7a10]",
  dismissed: "bg-ink/8 text-ink/40",
};

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

        {(items ?? []).length === 0 ? (
          <div className="card p-8 text-center text-ink/40">No feedback submitted yet.</div>
        ) : (
          <div className="space-y-3">
            {items!.map((f) => (
              <div key={f.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`badge text-[11px] ${TYPE_CLS[f.type] ?? TYPE_CLS.other}`}>
                    {TYPE_LABEL[f.type] ?? "Other"}
                  </span>
                  <span className={`badge text-[11px] ${STATUS_CLS[f.status] ?? STATUS_CLS.open}`}>
                    {f.status}
                  </span>
                  <span className="text-xs text-ink/40 ml-auto">
                    {fmtDayFull(new Date(f.created_at))}
                  </span>
                </div>
                <h3 className="font-bold text-ink">{f.title}</h3>
                <p className="text-sm text-ink/70 mt-1 whitespace-pre-wrap">{f.description}</p>
                <p className="text-xs text-ink/40 mt-2">
                  {f.user_name || "Unknown"}{f.user_email ? ` · ${f.user_email}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

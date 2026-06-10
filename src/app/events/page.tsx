import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { fmtRange } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";

export const dynamic = "force-dynamic";

export default async function MyEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: editorRows } = await supabase
    .from("event_editors")
    .select("event_id")
    .eq("user_id", user!.id);
  const editorIds = (editorRows ?? []).map((r) => r.event_id);

  const orFilter = editorIds.length
    ? `created_by.eq.${user!.id},id.in.(${editorIds.join(",")})`
    : `created_by.eq.${user!.id}`;

  const { data: events } = await supabase
    .from("events")
    .select(`
      id, title, ministry, rrule, starts_at, ends_at, status, created_by,
      campuses ( name ),
      space_requests ( status )
    `)
    .or(orFilter)
    .order("starts_at", { ascending: false });

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-imperial">My Events</h1>
            <p className="text-sm text-ink/50">Events you own or can edit.</p>
          </div>
          <Link href="/events/new" className="btn-primary">+ New Event</Link>
        </div>

        {!events?.length ? (
          <div className="card p-10 text-center text-ink/40">
            <p className="mb-3">No events yet.</p>
            <Link href="/events/new" className="btn-primary inline-block">Create your first event</Link>
          </div>
        ) : (
          <div className="grid gap-2">
            {events.map((ev: any) => {
              const counts = { pending: 0, approved: 0, denied: 0 };
              for (const sr of ev.space_requests ?? []) {
                if (sr.status in counts) counts[sr.status as keyof typeof counts]++;
              }
              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 hover:border-cerulean/50 transition-colors">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">{ev.title} {ev.status === "cancelled" && <span className="badge bg-ink/10 text-ink/40 ml-1">Cancelled</span>}</div>
                    <div className="text-xs text-ink/50">
                      {fmtRange(new Date(ev.starts_at), new Date(ev.ends_at))} · {describeRecurrence(ev.rrule)} · {ev.campuses?.name}
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-xs">
                    {counts.approved > 0 && <span className="badge bg-radiant/20 text-[#5a7a10]">{counts.approved} approved</span>}
                    {counts.pending > 0 && <span className="badge bg-sand text-[#8a6320]">{counts.pending} pending</span>}
                    {counts.denied > 0 && <span className="badge bg-coral/15 text-coral">{counts.denied} denied</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

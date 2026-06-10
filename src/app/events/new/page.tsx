import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import NewEventForm from "./NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: campuses } = await supabase
    .from("campuses")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-imperial mb-1">New Event</h1>
        <p className="text-sm text-ink/50 mb-6">
          Step 1 of 2 — create the event, then add the spaces you need.
        </p>
        <NewEventForm campuses={campuses ?? []} />
      </main>
    </>
  );
}

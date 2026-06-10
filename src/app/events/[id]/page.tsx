import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EventDetail from "./EventDetail";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from("events")
    .select(`
      *,
      campuses ( id, name, slug ),
      profiles!events_created_by_fkey ( id, full_name, email )
    `)
    .eq("id", id)
    .single();

  if (!event) notFound();

  const [{ data: occurrences }, { data: requests }, { data: editors }, { data: spaces }, { data: buildings }, { data: profile }] =
    await Promise.all([
      supabase.from("event_occurrences").select("*").eq("event_id", id).order("starts_at"),
      supabase.from("space_requests").select(`*, spaces ( id, name, capacity, amenities, building_id, buildings ( name ) ), profiles!space_requests_requested_by_fkey ( full_name, email )`).eq("event_id", id).order("created_at"),
      supabase.from("event_editors").select(`user_id, profiles!event_editors_user_id_fkey ( id, full_name, email )`).eq("event_id", id),
      supabase.from("spaces").select("id, campus_id, building_id, group_name, name, capacity, amenities, sort_order").eq("campus_id", event.campus_id).eq("active", true).order("sort_order"),
      supabase.from("buildings").select("id, campus_id, name, sort_order").eq("campus_id", event.campus_id).order("sort_order"),
      supabase.from("profiles").select("role").eq("id", user!.id).single(),
    ]);

  const isOwner = event.created_by === user!.id;
  const isEditor = (editors ?? []).some((e) => e.user_id === user!.id);
  const isSuper = profile?.role === "super_admin";
  const canEdit = isOwner || isEditor || isSuper;

  return (
    <>
      <Nav />
      <EventDetail
        event={event}
        occurrences={occurrences ?? []}
        requests={(requests ?? []) as any}
        editors={(editors ?? []) as any}
        spaces={spaces ?? []}
        buildings={buildings ?? []}
        canEdit={canEdit}
        currentUserId={user!.id}
      />
    </>
  );
}

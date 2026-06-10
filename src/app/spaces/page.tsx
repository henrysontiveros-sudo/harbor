import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import SpaceFinder from "./SpaceFinder";

export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const supabase = await createClient();
  const { data: campuses } = await supabase
    .from("campuses")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");
  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, campus_id, name, sort_order")
    .order("sort_order");
  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, campus_id, building_id, group_name, name, capacity, amenities, sort_order")
    .eq("active", true)
    .order("sort_order");

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-imperial mb-1">Find a Space</h1>
        <p className="text-sm text-ink/50 mb-6">
          Pick a time window to see what&apos;s free.
        </p>
        <SpaceFinder
          campuses={campuses ?? []}
          buildings={buildings ?? []}
          spaces={(spaces ?? []).map((s) => ({ ...s, amenities: s.amenities ?? [] }))}
        />
      </main>
    </>
  );
}

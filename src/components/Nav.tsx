import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";
import MobileNav from "./MobileNav";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let canCreate = false;
  let name = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
    canCreate = ["staff", "admin", "super_admin"].includes(profile?.role ?? "");
    name = profile?.full_name ?? user.email ?? "";
    if (!isAdmin) {
      const { count } = await supabase
        .from("campus_admins")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      isAdmin = (count ?? 0) > 0;
    }
  }

  return (
    <header className="bg-imperial text-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3 md:gap-6">
        <Link href="/" className="flex items-center gap-2 font-black text-lg tracking-tight">
          Harbor
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm flex-1">
          <Link href="/" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
            This Week
          </Link>
          <Link href="/spaces" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
            Find a Space
          </Link>
          <Link href="/events" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
            My Events
          </Link>
          <Link href="/setup-sheet" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
            Setup Sheet
          </Link>
          {isAdmin && (
            <Link href="/approvals" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
              Approvals
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
              Admin
            </Link>
          )}
        </nav>
        {canCreate && (
          <Link href="/events/new" className="hidden md:inline-block bg-sky text-imperial font-bold text-sm px-3.5 py-1.5 rounded-md hover:bg-white transition-colors">
            + New Event
          </Link>
        )}
        <div className="hidden md:flex items-center gap-2 text-xs text-white/70">
          <span className="hidden sm:block max-w-[140px] truncate">{name}</span>
          <SignOutButton />
        </div>
        <MobileNav isAdmin={isAdmin} canCreate={canCreate} name={name} />
      </div>
    </header>
  );
}

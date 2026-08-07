import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/calendar");

  const { data: me } = await supabase
    .from("profiles").select("calendar_token, role").eq("id", user.id).single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://harbor.inov8-socal.tech";

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-imperial mb-1">Calendar Subscriptions</h1>
        <p className="text-sm text-ink/50 mb-6">
          Subscribe once and your calendar app keeps these up to date automatically. Choose the
          view you want, then add the link to Google Calendar, Apple Calendar, or Outlook.
        </p>
        <CalendarClient
          token={me?.calendar_token ?? ""}
          appUrl={appUrl}
          isAdmin={me?.role === "admin" || me?.role === "super_admin"}
        />
      </main>
    </>
  );
}

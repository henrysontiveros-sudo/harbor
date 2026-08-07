import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/security-log";

// Root not-found boundary. Catches both explicit notFound() calls (e.g. a link
// to an event that no longer exists) and any unmatched URL across the app.
// Rather than showing a dead-end 404, we quietly log the miss (hidden security
// trail) and reroute the user home.
export default async function NotFound() {
  try {
    const h = await headers();
    const path = h.get("x-pathname"); // injected by the proxy
    const ua = h.get("user-agent");
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;

    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
      userEmail = user?.email ?? null;
    } catch {
      // no session / unreadable — log anonymously
    }

    await logSecurityEvent({
      kind: "not_found",
      path,
      ip,
      userAgent: ua,
      userId,
      userEmail,
    });
  } catch {
    // never let logging block the reroute
  }

  redirect("/");
}

import { redirect } from "next/navigation";

// Root not-found boundary. Catches both explicit notFound() calls (e.g. a link
// to an event that no longer exists) and any unmatched URL across the app.
// Rather than showing a dead-end 404, reroute the user home.
export default function NotFound() {
  redirect("/");
}

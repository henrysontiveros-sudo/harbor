import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { logSecurityEvent } from "@/lib/security-log";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/confirm", "/privacy", "/terms", "/api/cron", "/api/calendar"];
const ALLOWED_DOMAINS = ["marinerschurch.org", "inov8-socal.tech"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Forward the attempted pathname to server components (the root not-found
  // boundary reads this to log dead-link 404s).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const ua = request.headers.get("user-agent");

  if (!user && !isPublic) {
    // Unauthenticated hit on a protected route. Skip the bare "/" (a logged-out
    // first visit is benign and would flood the log); everything else — /admin,
    // deep links, bot probes at random paths — is a real signal worth recording.
    if (path !== "/") {
      await logSecurityEvent({ kind: "unauthorized", path, ip, userAgent: ua });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Domain restriction: kick out non-org accounts
  if (user && !isPublic) {
    const domain = (user.email ?? "").split("@")[1]?.toLowerCase();
    if (!ALLOWED_DOMAINS.includes(domain)) {
      await logSecurityEvent({
        kind: "forbidden_domain",
        path,
        userId: user.id,
        userEmail: user.email ?? null,
        ip,
        userAgent: ua,
        detail: { domain: domain ?? null },
      });
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "domain");
      return NextResponse.redirect(url);
    }
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|logo|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|woff2?)$).*)",
  ],
};

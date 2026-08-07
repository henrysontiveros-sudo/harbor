import { createAdminClient } from "@/lib/supabase/admin";

export type SecurityEventKind = "not_found" | "unauthorized" | "forbidden_domain";

export interface SecurityEventInput {
  kind: SecurityEventKind;
  path?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detail?: Record<string, unknown> | null;
}

/**
 * Best-effort security audit trail. NEVER throws — a logging failure must never
 * block a request or a redirect. Writes via the service-role client (bypasses RLS).
 * Consumed by the proxy (unauthorized / forbidden_domain) and the root
 * not-found boundary (not_found).
 */
export async function logSecurityEvent(e: SecurityEventInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("security_log").insert({
      kind: e.kind,
      path: e.path ?? null,
      user_id: e.userId ?? null,
      user_email: e.userEmail ?? null,
      ip: e.ip ?? null,
      user_agent: e.userAgent ? e.userAgent.slice(0, 300) : null,
      detail: e.detail ?? null,
    });
  } catch {
    // Swallow — security logging is best-effort and must never break a request.
  }
}

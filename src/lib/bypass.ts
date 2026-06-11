// 48-hour lead-time rule for space requests.
// Bookings whose earliest applicable occurrence starts within this window are
// blocked at submission unless an admin bypass code is supplied.

export const LEAD_TIME_HOURS = 48;
const LEAD_TIME_MS = LEAD_TIME_HOURS * 3600_000;

/** True if the given start instant is inside the 48h lead-time window (too soon). */
export function withinLeadTime(startISO: string, now: Date = new Date()): boolean {
  const start = new Date(startISO).getTime();
  return start < now.getTime() + LEAD_TIME_MS;
}

/** True if ANY of the proposed start instants falls inside the lead-time window. */
export function anyWithinLeadTime(startISOs: string[], now: Date = new Date()): boolean {
  return startISOs.some((s) => withinLeadTime(s, now));
}

/** Normalize a typed bypass code: trim + uppercase (codes are stored uppercase). */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

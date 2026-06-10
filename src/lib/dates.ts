// Mariners brand date/time formatting:
// "Sat, Jan 21 • 8a-12:30p" — 3-letter day/month, no :00 on the hour,
// lowercase a/p, en-dash ranges.

const TZ = "America/Los_Angeles";

export function fmtTime(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")!.value;
  const m = parts.find((p) => p.type === "minute")!.value;
  const ap = parts.find((p) => p.type === "dayPeriod")!.value.toLowerCase().startsWith("a") ? "a" : "p";
  return m === "00" ? `${h}${ap}` : `${h}:${m}${ap}`;
}

export function fmtDay(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function fmtDayFull(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function fmtRange(start: Date, end: Date): string {
  return `${fmtDay(start)} • ${fmtTime(start)}–${fmtTime(end)}`;
}

export function fmtTimeRange(start: Date, end: Date): string {
  return `${fmtTime(start)}–${fmtTime(end)}`;
}

// LA-timezone date key (YYYY-MM-DD) for grouping
export function laDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Convert a datetime-local input value (LA wall time) to a UTC ISO string
export function laWallTimeToISO(local: string): string {
  // local: "2026-06-15T09:00"
  const [datePart, timePart] = local.split("T");
  const [y, mo, da] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  // Find UTC offset for that wall time in LA by probing
  const guess = new Date(Date.UTC(y, mo - 1, da, h, mi));
  for (const offsetH of [7, 8]) {
    const candidate = new Date(guess.getTime() + offsetH * 3600_000);
    const back = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(candidate);
    const get = (t: string) => back.find((p) => p.type === t)!.value;
    const hh = get("hour") === "24" ? "00" : get("hour");
    if (
      `${get("year")}-${get("month")}-${get("day")}` === datePart &&
      `${hh}:${get("minute")}` === `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`
    ) {
      return candidate.toISOString();
    }
  }
  // fallback: assume -8
  return new Date(guess.getTime() + 8 * 3600_000).toISOString();
}

// Convert UTC ISO to datetime-local input value in LA time
export function isoToLAWallTime(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const hh = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hh}:${get("minute")}`;
}

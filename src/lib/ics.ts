// Minimal RFC-5545 iCalendar (.ics) generation for Harbor calendar feeds.
// Occurrence timestamps are stored as UTC ISO strings, so we emit UTC (Z) times
// — no VTIMEZONE block needed, and calendar apps localize for the viewer.

export interface IcsEvent {
  uid: string;            // stable unique id (occurrence id)
  start: string;         // UTC ISO
  end: string;           // UTC ISO
  summary: string;
  description?: string | null;
  location?: string | null;
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  url?: string | null;
}

function toIcsUtc(iso: string): string {
  // 2026-08-07T01:30:00.000Z -> 20260807T013000Z
  const d = new Date(iso);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

// Escape per RFC 5545 §3.3.11 (text): backslash, semicolon, comma, newline.
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold lines to 75 octets per RFC 5545 §3.1 (continuation lines start w/ space).
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  parts.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

export function buildIcs(calName: string, events: IcsEvent[]): string {
  const now = toIcsUtc(new Date().toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mariners Church//Harbor//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`,
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}@harbor.inov8-socal.tech`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${toIcsUtc(e.start)}`);
    lines.push(`DTEND:${toIcsUtc(e.end)}`);
    lines.push(fold(`SUMMARY:${esc(e.summary)}`));
    if (e.location) lines.push(fold(`LOCATION:${esc(e.location)}`));
    if (e.description) lines.push(fold(`DESCRIPTION:${esc(e.description)}`));
    if (e.url) lines.push(fold(`URL:${esc(e.url)}`));
    lines.push(`STATUS:${e.status ?? "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}

import { RRule, Weekday } from "rrule";

export interface RecurrenceSpec {
  freq: "none" | "daily" | "weekly" | "biweekly" | "monthly";
  byweekday: number[]; // 0=Mon ... 6=Sun (rrule convention)
  until: string | null; // ISO date
}

const MAX_OCCURRENCES = 104; // ~2 years weekly cap
const DEFAULT_HORIZON_DAYS = 365;

// Generate occurrence start times from a spec + first start.
// Works in UTC instants; the first occurrence's wall-clock time is preserved
// by stepping in day/week increments (DST shifts of 1h accepted for v1).
export function generateOccurrences(
  firstStartISO: string,
  firstEndISO: string,
  spec: RecurrenceSpec
): { starts_at: string; ends_at: string }[] {
  const start = new Date(firstStartISO);
  const end = new Date(firstEndISO);
  const durationMs = end.getTime() - start.getTime();

  if (spec.freq === "none") {
    return [{ starts_at: start.toISOString(), ends_at: end.toISOString() }];
  }

  const until = spec.until
    ? new Date(spec.until + "T23:59:59-07:00")
    : new Date(start.getTime() + DEFAULT_HORIZON_DAYS * 86400_000);

  const freqMap = {
    daily: RRule.DAILY,
    weekly: RRule.WEEKLY,
    biweekly: RRule.WEEKLY,
    monthly: RRule.MONTHLY,
  } as const;

  const rule = new RRule({
    freq: freqMap[spec.freq],
    interval: spec.freq === "biweekly" ? 2 : 1,
    dtstart: start,
    until,
    count: MAX_OCCURRENCES,
    byweekday:
      spec.freq === "weekly" || spec.freq === "biweekly"
        ? spec.byweekday.length
          ? spec.byweekday.map((d) => new Weekday(d))
          : undefined
        : undefined,
  });

  const dates = rule.all().slice(0, MAX_OCCURRENCES);
  return dates.map((d) => ({
    starts_at: d.toISOString(),
    ends_at: new Date(d.getTime() + durationMs).toISOString(),
  }));
}

export function specToRRuleString(spec: RecurrenceSpec): string | null {
  if (spec.freq === "none") return null;
  const parts = [
    `FREQ=${spec.freq === "biweekly" ? "WEEKLY" : spec.freq.toUpperCase()}`,
  ];
  if (spec.freq === "biweekly") parts.push("INTERVAL=2");
  if ((spec.freq === "weekly" || spec.freq === "biweekly") && spec.byweekday.length) {
    const names = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
    parts.push(`BYDAY=${spec.byweekday.map((d) => names[d]).join(",")}`);
  }
  if (spec.until) parts.push(`UNTIL=${spec.until.replace(/-/g, "")}`);
  return parts.join(";");
}

export function describeRecurrence(rrule: string | null): string {
  if (!rrule) return "One-time";
  const dayNames: Record<string, string> = {
    MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun",
  };
  const get = (k: string) => rrule.match(new RegExp(`${k}=([^;]+)`))?.[1];
  const freq = get("FREQ");
  const interval = get("INTERVAL");
  const byday = get("BYDAY");
  const days = byday ? byday.split(",").map((d) => dayNames[d] ?? d).join(", ") : "";
  if (freq === "DAILY") return "Daily";
  if (freq === "WEEKLY")
    return `${interval === "2" ? "Every other week" : "Weekly"}${days ? " on " + days : ""}`;
  if (freq === "MONTHLY") return "Monthly";
  return "Recurring";
}

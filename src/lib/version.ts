export const CURRENT_VERSION = "1.32";

export type ChangeType = "feature" | "improvement" | "fix" | "security";

export interface VersionChange {
  type: ChangeType;
  text: string;
}

export interface VersionEntry {
  version: string;
  date: string;
  changes: VersionChange[];
}

export const CHANGELOG: VersionEntry[] = [
  {
    version: "1.0",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "Event-first workflow — create an event, then request spaces for it" },
      { type: "feature", text: "Recurring events: daily, weekly, biweekly, and monthly schedules" },
      { type: "feature", text: "Space requests with tables, chairs, setup style, placement notes, tech/AV, and catering" },
      { type: "feature", text: "Live conflict detection — double-booked spaces are flagged and blocked before submission" },
      { type: "feature", text: "This Week view — browse all approved events across campus" },
      { type: "feature", text: "Find a Space — free/busy checker by campus, time window, and capacity" },
      { type: "feature", text: "Per-campus admin approvals with approve/deny reasons" },
      { type: "feature", text: "Event editors — add collaborators who can manage your event" },
      { type: "feature", text: "All 6 campuses (Irvine, Mission Viejo, Santa Ana, Trabuco Canyon, Huntington Beach, Anaheim) with 115 Irvine spaces seeded" },
      { type: "feature", text: "Mariners branding — Gotham typography, brand palette, and date formatting" },
      { type: "feature", text: "Login restricted to marinerschurch.org via email magic link" },
    ],
  },
  {
    version: "1.1",
    date: "June 10, 2026",
    changes: [
      { type: "fix", text: "Magic-link login emails now redirect to the live site correctly" },
      { type: "improvement", text: "Spaces nested by floor and area within each building (Ministry Center floors, Preschool, Prayer Rooms, Studio) — matching the eSpace hierarchy" },
    ],
  },
  {
    version: "1.2",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "Version badge with change log (bottom-left)" },
      { type: "feature", text: "In-app feedback — report bugs and suggest ideas from any page (bottom-right)" },
    ],
  },
  {
    version: "1.3",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "Email notifications — requesters now receive an email when their space request is approved or denied" },
      { type: "feature", text: "Edit space requests — modify a pending or approved request (resubmits for approval), or edit & resubmit a denied one" },
      { type: "feature", text: "Setup Sheet — printable day-of run sheet per campus with setups, tech, and catering grouped by building" },
    ],
  },
  {
    version: "1.31",
    date: "June 10, 2026",
    changes: [
      { type: "improvement", text: "Notification emails now use the Mariners circle-M logo in the header" },
    ],
  },
  {
    version: "1.32",
    date: "June 10, 2026",
    changes: [
      { type: "fix", text: "Email header logo now blends seamlessly with the blue header (no dark box behind it)" },
    ],
  },
];

export const CURRENT_VERSION = "2.1";

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
    version: "2.1",
    date: "August 6, 2026",
    changes: [
      { type: "security", text: "Campus-admin assignments and removals are now recorded in the activity log, including any automatic Staff↔Admin role changes they trigger" },
    ],
  },
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
    version: "1.4",
    date: "June 10, 2026",
    changes: [
      { type: "improvement", text: "Notification emails now use the Mariners circle-M logo in the header" },
      { type: "fix", text: "Email header logo blends seamlessly with the blue header (no dark box behind it)" },
    ],
  },
  {
    version: "1.5",
    date: "June 10, 2026",
    changes: [
      { type: "improvement", text: "Notification emails optimized for mobile — responsive layout, proper scaling, and full-width action button on phones" },
    ],
  },
  {
    version: "1.6",
    date: "June 10, 2026",
    changes: [
      { type: "improvement", text: "Full mobile optimization — hamburger menu, responsive layouts on every page, stacked forms and modals, and larger tap targets on phones" },
    ],
  },
  {
    version: "1.7",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "Google sign-in is now the single login method — staff sign in with their Mariners Church Google account (magic-link email login removed)" },
    ],
  },
  {
    version: "1.8",
    date: "June 10, 2026",
    changes: [
      { type: "improvement", text: "Cleaner, more professional interface — removed decorative emojis and redundant page subtitles throughout" },
      { type: "feature", text: "Added Privacy Policy and Terms of Service pages (required for Google sign-in verification)" },
    ],
  },
  {
    version: "1.9",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "New members are view-only by default — they can browse schedules and spaces but cannot create events or requests until promoted" },
      { type: "feature", text: "Users & Roles admin page — super admins can set each person's role (Viewer, Staff, Admin, Super Admin)" },
      { type: "feature", text: "Redesigned Admin dashboard with at-a-glance stats, a feedback inbox, an activity log, and a system diagnostics page" },
      { type: "security", text: "Users can no longer change their own role; role changes are restricted to super admins and recorded in the activity log" },
    ],
  },
  {
    version: "2.0",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "48-hour lead time — space requests must be submitted at least 48 hours before the event starts" },
      { type: "feature", text: "Admin bypass codes — admins can issue on-call override codes that approve a within-48h booking instantly, regardless of space, time, or conflicts" },
      { type: "feature", text: "Bypass code usage is logged and the issuing admin is emailed each time their code is used" },
      { type: "feature", text: "New Bypass Codes admin page to issue, label, limit, expire, and deactivate codes, with a full usage log" },
    ],
  },
];

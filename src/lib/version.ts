export const CURRENT_VERSION = "1.24";

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
    version: "1.24",
    date: "August 7, 2026",
    changes: [
      { type: "feature", text: "Groups & ministries — staff can now only book for the ministries they're assigned to. Admins create groups and assign individual staff accounts to them (a person can belong to several). When booking, staff pick from their own groups; someone with no group can't create bookings. This prevents shared department emails from being used to submit requests. Enforced at the database level. Admins and super admins can still book for any ministry." },
    ],
  },
  {
    version: "1.23",
    date: "August 7, 2026",
    changes: [
      { type: "feature", text: "Bulk pre-assign people from CSV — admins can now upload a CSV of email, role, and Facilities access before anyone signs in. When each person first signs in with Google, their access is applied automatically, so there's no scramble to set permissions at sign-in. Includes an on-page CSV example with a download button. Only super admins can pre-assign the super_admin role." },
    ],
  },
  {
    version: "1.22",
    date: "August 7, 2026",
    changes: [
      { type: "improvement", text: "Removed the \"you receive this because…\" footer note from the daily facilities setup sheet email — cleaner run sheet." },
    ],
  },
  {
    version: "1.21",
    date: "August 7, 2026",
    changes: [
      { type: "feature", text: "Daily facilities setup sheet email — the Facilities team now gets today's run sheet (approved setups grouped by building, with tables/chairs/style, tech, catering, and notes) emailed automatically each morning at 5am PT, in time for setup. Sends only on days with scheduled setups; goes to Facilities team members for the Irvine congregation." },
    ],
  },
  {
    version: "1.20",
    date: "August 6, 2026",
    changes: [
      { type: "feature", text: "Facilities access — the Setup Sheet (day-of run sheet, grouped by building) is now restricted to Facilities team members plus admins. Super admins grant access with a per-person \"Facilities\" checkbox on the Users & Roles page." },
    ],
  },
  {
    version: "1.19",
    date: "August 6, 2026",
    changes: [
      { type: "improvement", text: "Renamed \"campus\" to \"congregation\" throughout the app — every label, filter, form, and email now reads \"congregation(s)\" to match Mariners' language" },
      { type: "fix", text: "Fixed the Mariners logo in all notification emails — removed the black box behind the mark; the email header now shows the clean white circle-M" },
    ],
  },
  {
    version: "1.18",
    date: "August 6, 2026",
    changes: [
      { type: "improvement", text: "Smoothed the Mariners circle-M logo edges — removed the stair-stepping/jaggies on the login screen and tab/app icons using a supersampled edge cleanup while keeping the authentic official mark" },
    ],
  },
  {
    version: "1.17",
    date: "August 6, 2026",
    changes: [
      { type: "fix", text: "Login and tab/app icons now use the actual Mariners circle-M logo (background removed from the original mark) instead of a redrawn version — matches the official logo" },
    ],
  },
  {
    version: "1.16",
    date: "August 6, 2026",
    changes: [
      { type: "improvement", text: "Rebuilt the Mariners circle-M as clean geometry — perfectly round ring, crisp M and j-hook — used consistently on the login screen and the browser tab/app icons (replaces the earlier jagged traced version)" },
    ],
  },
  {
    version: "1.15",
    date: "August 6, 2026",
    changes: [
      { type: "improvement", text: "Login logo is now a clean white vector Mariners circle-M with no background box (replaces the boxed raster image)" },
    ],
  },
  {
    version: "1.14",
    date: "August 6, 2026",
    changes: [
      { type: "improvement", text: "Login screen now shows the Mariners circle-M above the sign-in box" },
      { type: "improvement", text: "The version badge and change log are now visible only to signed-in users (hidden on the login and public policy pages)" },
    ],
  },
  {
    version: "1.13",
    date: "August 6, 2026",
    changes: [
      { type: "improvement", text: "Browser tab icon (favicon) is now the Mariners circle-M on Imperial Blue, replacing the default placeholder — includes tab, bookmark, and Apple touch icon sizes" },
    ],
  },
  {
    version: "1.12",
    date: "August 6, 2026",
    changes: [
      { type: "feature", text: "Daily approval digest — congregation admins and super admins get one morning email listing the space requests pending their review, with event date, location, ministry, and who submitted it. Sends only on days with pending requests; each admin sees only their own congregations." },
    ],
  },
  {
    version: "1.11",
    date: "August 6, 2026",
    changes: [
      { type: "security", text: "Congregation-admin assignments and removals are now recorded in the activity log, including any automatic Staff↔Admin role changes they trigger" },
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
      { type: "feature", text: "This Week view — browse all approved events across the congregation" },
      { type: "feature", text: "Find a Space — free/busy checker by congregation, time window, and capacity" },
      { type: "feature", text: "Per-congregation admin approvals with approve/deny reasons" },
      { type: "feature", text: "Event editors — add collaborators who can manage your event" },
      { type: "feature", text: "All 6 congregations (Irvine, Mission Viejo, Santa Ana, Trabuco Canyon, Huntington Beach, Anaheim) with 115 Irvine spaces seeded" },
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
      { type: "feature", text: "Setup Sheet — printable day-of run sheet per congregation with setups, tech, and catering grouped by building" },
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
    version: "1.10",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "48-hour lead time — space requests must be submitted at least 48 hours before the event starts" },
      { type: "feature", text: "Admin bypass codes — admins can issue on-call override codes that approve a within-48h booking instantly, regardless of space, time, or conflicts" },
      { type: "feature", text: "Bypass code usage is logged and the issuing admin is emailed each time their code is used" },
      { type: "feature", text: "New Bypass Codes admin page to issue, label, limit, expire, and deactivate codes, with a full usage log" },
    ],
  },
];

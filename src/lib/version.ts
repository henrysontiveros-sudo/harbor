export const CURRENT_VERSION = "1.35";

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

/**
 * Parse a "major.minor" version string into a comparable number tuple.
 * "1.28" -> [1, 28], "1.9" -> [1, 9]. Missing parts default to 0.
 */
function parseVersion(v: string): [number, number] {
  const [maj, min] = v.split(".");
  return [parseInt(maj, 10) || 0, parseInt(min ?? "0", 10) || 0];
}

/**
 * CHANGELOG sorted newest-first by semantic version (numeric minor, so
 * 1.10 > 1.9). Use this for display instead of relying on array insertion
 * order or a fragile `.reverse()` — entries can be added anywhere in the
 * array and will still render in the correct order.
 */
export function sortedChangelog(): VersionEntry[] {
  return [...CHANGELOG].sort((a, b) => {
    const [aMaj, aMin] = parseVersion(a.version);
    const [bMaj, bMin] = parseVersion(b.version);
    return bMaj - aMaj || bMin - aMin;
  });
}

export const CHANGELOG: VersionEntry[] = [
  {
    version: "1.35",
    date: "August 7, 2026",
    changes: [
      { type: "improvement", text: "When creating an event, the ministry picker now shows each ministry's color and groups related ministries under their parent (e.g. Kids, High School, and Junior High under Next Gen) so it's easier to find the right one." },
    ],
  },
  {
    version: "1.34",
    date: "August 7, 2026",
    changes: [
      { type: "feature", text: "You can now request services on an event — Childcare, Safety, Production, Catering, and the Vehicle Use Policy Form. Each congregation offers its own set, and requests are routed to that congregation's team for approval alongside spaces and resources." },
    ],
  },
  {
    version: "1.33",
    date: "August 7, 2026",
    changes: [
      { type: "feature", text: "You can now request resources on an event — vehicles (vans, box trucks) and equipment (tables, chairs, easels, podiums, and more). Pick a quantity, and Harbor checks live availability against other bookings so you can't over-book. Requests are approved by the relevant congregation admin, right alongside space approvals." },
      { type: "feature", text: "Three more congregations are live: Oceanside, Tustin, and North Irvine — with their spaces ready to book." },
      { type: "improvement", text: "The ministry list now matches Mariners' real ministries, each with its own color." },
    ],
  },
  {
    version: "1.32",
    date: "August 7, 2026",
    changes: [
      { type: "feature", text: "Admins can now mark feedback items as resolved (and reopen them if needed). The Feedback inbox defaults to showing only open items, with a toggle to view resolved ones." },
    ],
  },
  {
    version: "1.31",
    date: "August 7, 2026",
    changes: [
      { type: "feature", text: "Find a Space now has amenity filters — narrow results to spaces that have what you need (TV, conference table, projector, full tech set-up, and more). Select several to require all of them." },
    ],
  },
  {
    version: "1.30",
    date: "August 7, 2026",
    changes: [
      { type: "improvement", text: "Cleaned up the change log so it shows a clear, focused history of features and improvements, newest first." },
    ],
  },
  {
    version: "1.27",
    date: "August 7, 2026",
    changes: [
      { type: "improvement", text: "Broken or expired links (for example, a link to an event that no longer exists) now send you back to the home page instead of showing a \"page not found\" screen." },
    ],
  },
  {
    version: "1.26",
    date: "August 7, 2026",
    changes: [
      { type: "feature", text: "Live calendar subscriptions — subscribe to a always-updating calendar feed of your bookings, your ministries' bookings, or your congregations' bookings from the new Calendar page. Add it once to Apple Calendar, Google Calendar, or Outlook and it stays in sync automatically. Each link is private to you and can be reset at any time." },
    ],
  },
  {
    version: "1.25",
    date: "August 7, 2026",
    changes: [
      { type: "improvement", text: "The weekly schedule now opens to the Irvine congregation by default, with every other congregation one tap away and an \"All Congregations\" option. Everyone can still view any congregation." },
    ],
  },
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
    ],
  },
  {
    version: "1.14",
    date: "August 6, 2026",
    changes: [
      { type: "improvement", text: "The version badge and change log are now visible only to signed-in users (hidden on the login and public policy pages)" },
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
    version: "1.10",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "48-hour lead time — space requests must be submitted at least 48 hours before the event starts" },
      { type: "feature", text: "Admin bypass codes — admins can issue on-call override codes that approve a within-48h booking instantly, regardless of space, time, or conflicts" },
      { type: "feature", text: "Bypass code usage is logged and the issuing admin is emailed each time their code is used" },
      { type: "feature", text: "New Bypass Codes admin page to issue, label, limit, expire, and deactivate codes, with a full usage log" },
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
    version: "1.8",
    date: "June 10, 2026",
    changes: [
      { type: "improvement", text: "Cleaner, more professional interface — removed decorative emojis and redundant page subtitles throughout" },
      { type: "feature", text: "Added Privacy Policy and Terms of Service pages (required for Google sign-in verification)" },
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
    version: "1.6",
    date: "June 10, 2026",
    changes: [
      { type: "improvement", text: "Full mobile optimization — hamburger menu, responsive layouts on every page, stacked forms and modals, and larger tap targets on phones" },
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
    version: "1.3",
    date: "June 10, 2026",
    changes: [
      { type: "feature", text: "Email notifications — requesters now receive an email when their space request is approved or denied" },
      { type: "feature", text: "Edit space requests — modify a pending or approved request (resubmits for approval), or edit & resubmit a denied one" },
      { type: "feature", text: "Setup Sheet — printable day-of run sheet per congregation with setups, tech, and catering grouped by building" },
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
    version: "1.1",
    date: "June 10, 2026",
    changes: [
      { type: "improvement", text: "Spaces nested by floor and area within each building (Ministry Center floors, Preschool, Prayer Rooms, Studio) — matching the eSpace hierarchy" },
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
    ],
  },
];

// Accounts that cannot be demoted, locked out, or altered through the admin UI.
// These are the owner's accounts plus the internal Dev Team account used for
// maintenance/QA. Guarded in the role and facilities API routes.
export const PROTECTED_EMAILS = [
  "hontiveros@marinerschurch.org",
  "henrysontiveros@gmail.com",
  "qa-agent@inov8-socal.tech", // Dev Team — internal maintenance account
];

export function isProtectedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return PROTECTED_EMAILS.includes(email.toLowerCase());
}

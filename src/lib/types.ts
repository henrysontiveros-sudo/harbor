export type UserRole = "viewer" | "staff" | "admin" | "super_admin";

/** Roles allowed to create events and submit space requests. Viewers are read-only. */
export const CAN_REQUEST_ROLES: UserRole[] = ["staff", "admin", "super_admin"];
export function canRequest(role: UserRole | null | undefined): boolean {
  return !!role && CAN_REQUEST_ROLES.includes(role);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: "Viewer",
  staff: "Staff",
  admin: "Admin",
  super_admin: "Super Admin",
};
export type RequestStatus = "draft" | "pending" | "approved" | "denied" | "cancelled";
export type RequestScope = "whole_event" | "occurrence";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

export interface Campus {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  active: boolean;
}

export interface Building {
  id: string;
  campus_id: string;
  name: string;
  sort_order: number;
}

export interface Space {
  id: string;
  campus_id: string;
  building_id: string | null;
  name: string;
  capacity: number | null;
  amenities: string[];
  description: string | null;
  requires_approval: boolean;
  active: boolean;
  sort_order: number;
  buildings?: { name: string } | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  ministry: string | null;
  campus_id: string;
  created_by: string;
  status: "active" | "cancelled";
  rrule: string | null;
  starts_at: string;
  ends_at: string;
  recurrence_until: string | null;
  created_at: string;
}

export interface Occurrence {
  id: string;
  event_id: string;
  starts_at: string;
  ends_at: string;
  cancelled: boolean;
}

export interface SpaceRequest {
  id: string;
  event_id: string;
  space_id: string;
  scope: RequestScope;
  occurrence_id: string | null;
  status: RequestStatus;
  tables_qty: number;
  chairs_qty: number;
  setup_style: string | null;
  setup_notes: string | null;
  tech_needed: boolean;
  tech_details: string | null;
  catering_needed: boolean;
  catering_details: string | null;
  requested_by: string;
  decided_by: string | null;
  decided_at: string | null;
  denial_reason: string | null;
  created_at: string;
}

export const SETUP_STYLES = [
  "As-Is",
  "Rounds",
  "Classroom",
  "Theater",
  "U-Shape",
  "Boardroom",
  "Banquet",
  "Custom (see notes)",
] as const;

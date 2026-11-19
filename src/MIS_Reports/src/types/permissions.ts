/**
 * Permission Types
 * Based on Prisma schema: System, Section, UserPermission models
 */

export enum Role {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
  COMPANY = 'COMPANY',
}

export interface SystemPermission {
  id: string;
  key: string; // System key (e.g., "checklist_delegation", "maintenance_pro")
  name: string; // Display name
  isActive: boolean;
  sections: SectionPermission[];
}

export interface SectionPermission {
  id: string;
  systemKey: string; // Reference to parent system
  key: string; // Section key (e.g., "dashboard", "assign_task")
  name: string; // Display name
  isActive: boolean;
  permissions: UserPermission;
}

export interface UserPermission {
  canRead: boolean;
  canWrite: boolean;
  canApprove: boolean;
  canDelete: boolean;
  canSee: boolean;
}

export interface UserPermissionsData {
  role: Role;
  systems: SystemPermission[];
}

/**
 * Helper type for checking if user has access to a system/section
 */
export interface PermissionCheck {
  hasAccess: boolean;
  permissions?: UserPermission;
}

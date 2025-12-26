/**
 * Inheritance Types
 *
 * Defines types and interfaces for role inheritance system.
 * Inheritance allows organization-level roles to cascade to project-level permissions.
 */

import { ProjectRole } from '../../users/enums/project-role.enum';
import { OrganizationRole } from '../../users/enums/organization-role.enum';

/**
 * Source of a user's effective role
 */
export type RoleSource =
  | 'system_admin' // User is a system administrator
  | 'org_owner' // Inherited from organization OWNER role
  | 'org_admin' // Inherited from organization ORG_ADMIN role
  | 'explicit' // Explicitly assigned via ProjectMembership
  | 'none'; // No access

/**
 * Result of effective role calculation
 */
export interface EffectiveRoleResult {
  /**
   * The user's effective role on the project (null if no access)
   */
  effectiveRole: ProjectRole | null;

  /**
   * Source of the effective role
   */
  source: RoleSource;

  /**
   * User's organization role (if applicable)
   */
  organizationRole?: OrganizationRole;

  /**
   * User's explicit project role (if applicable)
   */
  projectRole?: ProjectRole;

  /**
   * Whether this role is inherited (vs explicitly assigned)
   */
  isInherited: boolean;

  /**
   * Organization ID (for context)
   */
  organizationId?: string;

  /**
   * Organization name (for display)
   */
  organizationName?: string;
}

/**
 * Step in the inheritance chain
 */
export interface InheritanceStep {
  /**
   * Step number (1-based)
   */
  level: number;

  /**
   * Type of step
   */
  type: 'system_admin' | 'organization' | 'project';

  /**
   * Role at this level
   */
  role: string;

  /**
   * Source of the role (entity or mechanism)
   */
  source: string;

  /**
   * Human-readable description
   */
  description: string;
}

/**
 * Complete inheritance chain showing how a user got their permissions
 */
export interface InheritanceChain {
  /**
   * User ID
   */
  userId: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Steps in the inheritance chain
   */
  steps: InheritanceStep[];

  /**
   * Final effective role
   */
  finalRole: ProjectRole | null;

  /**
   * Whether access is granted
   */
  hasAccess: boolean;
}

/**
 * Project access information for a user
 */
export interface ProjectAccess {
  /**
   * Project ID
   */
  projectId: string;

  /**
   * Project name
   */
  projectName: string;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * Organization name
   */
  organizationName: string;

  /**
   * Effective role on this project
   */
  role: ProjectRole;

  /**
   * Source of access
   */
  source: RoleSource;

  /**
   * Whether access is inherited
   */
  isInherited: boolean;

  /**
   * Scope limitations (if any)
   */
  scope?: string[] | Record<string, string[]>;

  /**
   * Expiration date (if applicable)
   */
  expiresAt?: Date;
}

/**
 * Result of role change validation
 */
export interface RoleChangeValidation {
  /**
   * Whether the role change is allowed
   */
  allowed: boolean;

  /**
   * Reason if not allowed
   */
  reason?: string;

  /**
   * Current effective role
   */
  currentRole?: ProjectRole;

  /**
   * Source of current role
   */
  currentSource?: RoleSource;
}

/**
 * Project member with inheritance information
 */
export interface ProjectMemberWithInheritance {
  /**
   * User ID
   */
  userId: string;

  /**
   * User's full name
   */
  userName: string;

  /**
   * User's email
   */
  userEmail: string;

  /**
   * Effective role on project
   */
  role: ProjectRole;

  /**
   * Source of access
   */
  source: RoleSource;

  /**
   * Whether access is inherited
   */
  isInherited: boolean;

  /**
   * Organization role (if applicable)
   */
  organizationRole?: OrganizationRole;

  /**
   * Scope limitations (if any)
   */
  scope?: string[] | Record<string, string[]>;

  /**
   * Expiration date (if applicable)
   */
  expiresAt?: Date;

  /**
   * When user was added to project (explicit only)
   */
  addedAt?: Date;
}

/**
 * Cache entry for inheritance lookups
 */
export interface InheritanceCache {
  /**
   * User ID
   */
  userId: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Effective role
   */
  effectiveRole: ProjectRole | null;

  /**
   * Source of role
   */
  source: RoleSource;

  /**
   * Whether inherited
   */
  isInherited: boolean;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * Organization role (if applicable)
   */
  organizationRole?: OrganizationRole;

  /**
   * When cached
   */
  cachedAt: Date;

  /**
   * When cache expires
   */
  expiresAt: Date;
}

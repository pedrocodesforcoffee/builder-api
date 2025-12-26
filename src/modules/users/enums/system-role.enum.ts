/**
 * System Role Enum
 *
 * Defines platform-wide access levels for users.
 * This is separate from organization and project roles.
 *
 * @enum SystemRole
 */
export enum SystemRole {
  /**
   * Default role for all users
   * Standard access to features they're granted via organization/project membership
   */
  USER = 'user',

  /**
   * Platform administrator
   * Full access to all organizations, projects, and system settings
   * Should be limited to a small number of trusted users
   */
  SYSTEM_ADMIN = 'system_admin',
}

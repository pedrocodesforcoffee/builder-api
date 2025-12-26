/**
 * Organization Role Enum
 *
 * Defines access levels within an organization.
 * These roles determine what actions a user can perform within an organization.
 *
 * Hierarchy (highest to lowest):
 * 1. OWNER - Full control including billing and org deletion
 * 2. ORG_ADMIN - Administrative access except billing/deletion
 * 3. ORG_MEMBER - Standard member access
 * 4. GUEST - Limited read-only access
 *
 * @enum OrganizationRole
 */
export enum OrganizationRole {
  /**
   * Organization Owner
   * - Full access to all organization settings and data
   * - Can manage billing and subscription
   * - Can delete the organization
   * - Can transfer ownership
   * - Automatically gets admin access to all projects
   */
  OWNER = 'owner',

  /**
   * Organization Administrator
   * - Can manage organization settings
   * - Can invite/remove members
   * - Can create/delete projects
   * - Can manage organization-wide permissions
   * - Automatically gets admin access to all projects
   * - Cannot manage billing or delete organization
   */
  ORG_ADMIN = 'org_admin',

  /**
   * Organization Member
   * - Standard member access
   * - Can view organization details
   * - Can be assigned to projects
   * - Cannot manage organization settings
   * - Project access determined by project membership
   */
  ORG_MEMBER = 'org_member',

  /**
   * Guest
   * - Limited read-only access
   * - Can view assigned projects only
   * - Cannot create or modify data
   * - Useful for external stakeholders (e.g., clients, consultants)
   */
  GUEST = 'guest',
}

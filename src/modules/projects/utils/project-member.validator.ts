import { BadRequestException } from '@nestjs/common';
import { ProjectRole } from '../../users/enums/project-role.enum';

/**
 * Project Member Validation Utilities
 *
 * Provides validation functions to ensure business rules are enforced
 * when managing project memberships.
 */

/**
 * Validates the scope field format
 *
 * Scope can be:
 * - null/undefined (no limitations, full project access)
 * - Array of strings: ['electrical', 'plumbing', 'hvac']
 * - Object with string arrays: { trades: ['electrical'], floors: ['1', '2'], areas: ['north-wing'] }
 *
 * @param scope - The scope value to validate
 * @throws BadRequestException if scope format is invalid
 */
export function validateScope(scope?: string[] | Record<string, string[]>): void {
  // Null or undefined is valid (no scope limitations)
  if (scope === null || scope === undefined) {
    return;
  }

  // Array format validation
  if (Array.isArray(scope)) {
    // Must be non-empty
    if (scope.length === 0) {
      throw new BadRequestException(
        'Scope array cannot be empty. Use null to indicate no scope limitations.'
      );
    }

    // All elements must be strings
    if (!scope.every(item => typeof item === 'string')) {
      throw new BadRequestException(
        'Scope array must contain only string values.'
      );
    }

    // Strings should not be empty
    if (scope.some(item => item.trim().length === 0)) {
      throw new BadRequestException(
        'Scope array cannot contain empty strings.'
      );
    }

    return;
  }

  // Object format validation
  if (typeof scope === 'object' && scope !== null) {
    const keys = Object.keys(scope);

    // Must have at least one key
    if (keys.length === 0) {
      throw new BadRequestException(
        'Scope object cannot be empty. Use null to indicate no scope limitations.'
      );
    }

    // Validate each key-value pair
    for (const key of keys) {
      const value = scope[key];

      // Key must be a non-empty string
      if (typeof key !== 'string' || key.trim().length === 0) {
        throw new BadRequestException(
          'Scope object keys must be non-empty strings.'
        );
      }

      // Value must be an array
      if (!Array.isArray(value)) {
        throw new BadRequestException(
          `Scope object values must be arrays. Invalid value for key "${key}".`
        );
      }

      // Array must be non-empty
      if (value.length === 0) {
        throw new BadRequestException(
          `Scope array for key "${key}" cannot be empty. Remove the key if no restrictions apply.`
        );
      }

      // Array elements must be strings
      if (!value.every(item => typeof item === 'string')) {
        throw new BadRequestException(
          `Scope array for key "${key}" must contain only string values.`
        );
      }

      // Strings should not be empty
      if (value.some(item => item.trim().length === 0)) {
        throw new BadRequestException(
          `Scope array for key "${key}" cannot contain empty strings.`
        );
      }
    }

    return;
  }

  // Invalid format
  throw new BadRequestException(
    'Invalid scope format. Must be null, an array of strings, or an object with string array values.'
  );
}

/**
 * Validates the expiresAt field
 *
 * Business Rules:
 * - If set, must be a future date
 * - Should not be more than 5 years in the future (configurable)
 * - Useful for temporary contractor access
 *
 * @param expiresAt - The expiration date to validate
 * @param maxYearsInFuture - Maximum years in the future (default: 5)
 * @throws BadRequestException if expiration date is invalid
 */
export function validateExpiresAt(
  expiresAt?: Date,
  maxYearsInFuture: number = 5
): void {
  // Null or undefined is valid (no expiration)
  if (!expiresAt) {
    return;
  }

  // Must be a valid date
  if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime())) {
    throw new BadRequestException(
      'expiresAt must be a valid date.'
    );
  }

  // Must be in the future
  const now = new Date();
  if (expiresAt <= now) {
    throw new BadRequestException(
      'expiresAt must be a future date. Cannot set expiration in the past.'
    );
  }

  // Should not be too far in the future
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(maxFutureDate.getFullYear() + maxYearsInFuture);

  if (expiresAt > maxFutureDate) {
    throw new BadRequestException(
      `expiresAt cannot be more than ${maxYearsInFuture} years in the future.`
    );
  }
}

/**
 * Validates role hierarchy for project roles
 *
 * Business Rules:
 * - PROJECT_ADMIN has highest authority
 * - PROJECT_MANAGER can manage most roles except PROJECT_ADMIN
 * - Roles cannot assign roles higher than their own
 *
 * @param actorRole - The role of the user performing the action
 * @param targetRole - The role being assigned or modified
 * @throws BadRequestException if the role assignment violates hierarchy rules
 */
export function validateProjectRoleHierarchy(
  actorRole: ProjectRole,
  targetRole: ProjectRole
): void {
  // Define administrative hierarchy (not all roles, just those with management powers)
  const adminRoleHierarchy: Record<string, number> = {
    [ProjectRole.PROJECT_ADMIN]: 3,
    [ProjectRole.PROJECT_MANAGER]: 2,
    [ProjectRole.PROJECT_ENGINEER]: 1,
  };

  const actorLevel = adminRoleHierarchy[actorRole] || 0;
  const targetLevel = adminRoleHierarchy[targetRole] || 0;

  // Only project admins can assign project admin role
  if (targetRole === ProjectRole.PROJECT_ADMIN && actorRole !== ProjectRole.PROJECT_ADMIN) {
    throw new BadRequestException(
      'Only project admins can assign the project admin role to other members.'
    );
  }

  // Users with admin hierarchy cannot assign roles higher than their own
  if (targetLevel > 0 && targetLevel > actorLevel) {
    throw new BadRequestException(
      `Insufficient permissions: ${actorRole} cannot assign ${targetRole} role.`
    );
  }

  // Non-admin roles cannot manage members at all
  if (actorLevel === 0) {
    throw new BadRequestException(
      `Role ${actorRole} does not have permission to manage project members.`
    );
  }
}

/**
 * Validates invitation workflow timestamps
 *
 * Business Rules:
 * - invitedAt must be set when creating an invitation
 * - acceptedAt must be after invitedAt
 * - joinedAt must be after or equal to acceptedAt
 *
 * @param invitedAt - When the invitation was sent
 * @param acceptedAt - When the invitation was accepted
 * @param joinedAt - When the member actually joined
 * @throws BadRequestException if timestamps are invalid
 */
export function validateInvitationTimestamps(
  invitedAt?: Date,
  acceptedAt?: Date,
  joinedAt?: Date
): void {
  if (acceptedAt && !invitedAt) {
    throw new BadRequestException(
      'Cannot set acceptedAt without invitedAt. An invitation must be sent before it can be accepted.'
    );
  }

  if (joinedAt && !acceptedAt) {
    throw new BadRequestException(
      'Cannot set joinedAt without acceptedAt. An invitation must be accepted before joining.'
    );
  }

  if (invitedAt && acceptedAt && acceptedAt < invitedAt) {
    throw new BadRequestException(
      'acceptedAt cannot be before invitedAt. Acceptance must occur after invitation.'
    );
  }

  if (acceptedAt && joinedAt && joinedAt < acceptedAt) {
    throw new BadRequestException(
      'joinedAt cannot be before acceptedAt. Joining must occur after or at acceptance.'
    );
  }
}

/**
 * Validates scope is appropriate for the role
 *
 * Business Rules:
 * - SUBCONTRACTOR and FOREMAN roles typically have scope limitations
 * - PROJECT_ADMIN should not have scope limitations (they need full access)
 * - Warn if PROJECT_MANAGER has scope limitations (unusual but allowed)
 *
 * @param role - The project role
 * @param scope - The scope limitations
 * @returns Warning message if scope is unusual for the role, null otherwise
 */
export function validateScopeForRole(
  role: ProjectRole,
  scope?: string[] | Record<string, string[]>
): string | null {
  const hasScope = scope !== null && scope !== undefined;

  // PROJECT_ADMIN should not have scope limitations
  if (role === ProjectRole.PROJECT_ADMIN && hasScope) {
    return 'Warning: PROJECT_ADMIN roles typically should not have scope limitations as they need full project access.';
  }

  // PROJECT_MANAGER with scope is unusual but not an error
  if (role === ProjectRole.PROJECT_MANAGER && hasScope) {
    return 'Warning: PROJECT_MANAGER with scope limitations is unusual. Consider if this is intentional.';
  }

  // SUBCONTRACTOR and FOREMAN are expected to have scope
  if ((role === ProjectRole.SUBCONTRACTOR || role === ProjectRole.FOREMAN) && !hasScope) {
    return `Warning: ${role} roles typically have scope limitations to restrict access to their work areas.`;
  }

  return null;
}

/**
 * Validates that expiresAt is appropriate for the role
 *
 * Business Rules:
 * - SUBCONTRACTOR often has expiration (contract-based)
 * - INSPECTOR may have expiration (engagement-based)
 * - Core team roles (PROJECT_ADMIN, PROJECT_MANAGER) typically don't expire
 *
 * @param role - The project role
 * @param expiresAt - The expiration date
 * @returns Warning message if expiration is unusual for the role, null otherwise
 */
export function validateExpiresAtForRole(
  role: ProjectRole,
  expiresAt?: Date
): string | null {
  const hasExpiration = expiresAt !== null && expiresAt !== undefined;

  // Core team roles typically don't have expiration
  const coreRoles = [
    ProjectRole.PROJECT_ADMIN,
    ProjectRole.PROJECT_MANAGER,
    ProjectRole.PROJECT_ENGINEER,
  ];

  if (coreRoles.includes(role) && hasExpiration) {
    return `Warning: ${role} roles typically do not have expiration dates. Consider if this is intentional.`;
  }

  // Temporary roles should have expiration
  const temporaryRoles = [
    ProjectRole.SUBCONTRACTOR,
    ProjectRole.INSPECTOR,
  ];

  if (temporaryRoles.includes(role) && !hasExpiration) {
    return `Warning: ${role} roles typically have expiration dates. Consider setting an expiration for contract-based access.`;
  }

  return null;
}

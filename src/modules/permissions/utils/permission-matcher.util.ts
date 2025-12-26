/**
 * Permission Matching Utilities
 *
 * Handles wildcard and hierarchical permission matching
 * Format: feature:resource:action
 *
 * Examples:
 * - '*:*:*' matches all permissions
 * - 'documents:*:*' matches all document permissions
 * - 'documents:drawing:*' matches all drawing operations
 * - 'documents:drawing:read' matches exactly that permission
 */

import { Permission } from '../types/permission.types';

/**
 * Check if a required permission is satisfied by user's permissions
 *
 * @param userPermissions - Array of permissions the user has (may include wildcards)
 * @param requiredPermission - The specific permission being checked
 * @returns true if user has the required permission
 *
 * @example
 * hasPermission(['documents:*:read'], 'documents:drawing:read') // true
 * hasPermission(['documents:drawing:*'], 'documents:drawing:read') // true
 * hasPermission(['documents:drawing:create'], 'documents:drawing:read') // false
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  // Check if user has wildcard (all permissions)
  if (userPermissions.includes('*:*:*')) {
    return true;
  }

  // Check exact match first (most common case, fastest)
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check wildcard matches
  for (const userPerm of userPermissions) {
    if (matchesPermission(userPerm, requiredPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a user permission pattern matches a required permission
 *
 * @param userPermission - Permission with possible wildcards (e.g., 'documents:*:read')
 * @param requiredPermission - Specific permission to check (e.g., 'documents:drawing:read')
 * @returns true if the pattern matches
 */
export function matchesPermission(
  userPermission: string,
  requiredPermission: string,
): boolean {
  // Exact match
  if (userPermission === requiredPermission) {
    return true;
  }

  // Wildcard match
  if (userPermission === '*:*:*') {
    return true;
  }

  // Split into parts
  const userParts = userPermission.split(':');
  const requiredParts = requiredPermission.split(':');

  // Must have same number of parts (feature:resource:action)
  if (userParts.length !== 3 || requiredParts.length !== 3) {
    return false;
  }

  // Check each part
  for (let i = 0; i < 3; i++) {
    const userPart = userParts[i];
    const requiredPart = requiredParts[i];

    // Wildcard in user permission matches anything
    if (userPart === '*') {
      continue;
    }

    // Must match exactly if not wildcard
    if (userPart !== requiredPart) {
      return false;
    }
  }

  return true;
}

/**
 * Check if user has ANY of the required permissions
 *
 * @param userPermissions - Array of permissions the user has
 * @param requiredPermissions - Array of permissions to check (OR logic)
 * @returns true if user has at least one of the required permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  if (requiredPermissions.length === 0) {
    return false;
  }

  return requiredPermissions.some(required =>
    hasPermission(userPermissions, required),
  );
}

/**
 * Check if user has ALL of the required permissions
 *
 * @param userPermissions - Array of permissions the user has
 * @param requiredPermissions - Array of permissions to check (AND logic)
 * @returns true if user has all of the required permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  if (requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.every(required =>
    hasPermission(userPermissions, required),
  );
}

/**
 * Filter a list of permissions to only those the user has
 *
 * @param userPermissions - Array of permissions the user has
 * @param permissionsToCheck - Array of permissions to filter
 * @returns Array of permissions the user has from the input list
 */
export function filterPermissions(
  userPermissions: string[],
  permissionsToCheck: string[],
): string[] {
  return permissionsToCheck.filter(perm =>
    hasPermission(userPermissions, perm),
  );
}

/**
 * Create a permission map for bulk checking (useful for UI)
 *
 * @param userPermissions - Array of permissions the user has
 * @param permissionsToCheck - Array of permissions to check
 * @returns Map of permission -> boolean
 *
 * @example
 * createPermissionMap(
 *   ['documents:*:read'],
 *   ['documents:drawing:read', 'documents:drawing:create']
 * )
 * // Returns: { 'documents:drawing:read': true, 'documents:drawing:create': false }
 */
export function createPermissionMap(
  userPermissions: string[],
  permissionsToCheck: string[],
): Record<string, boolean> {
  const map: Record<string, boolean> = {};

  for (const perm of permissionsToCheck) {
    map[perm] = hasPermission(userPermissions, perm);
  }

  return map;
}

/**
 * Expand wildcard permissions to concrete permissions
 * Useful for auditing and debugging
 *
 * @param wildcardPermission - Permission with wildcards
 * @param allPermissions - Complete list of all possible permissions
 * @returns Array of concrete permissions that match the wildcard
 *
 * @example
 * expandWildcard('documents:*:read', allPermissions)
 * // Returns: ['documents:drawing:read', 'documents:photo:read', ...]
 */
export function expandWildcard(
  wildcardPermission: string,
  allPermissions: string[],
): string[] {
  if (wildcardPermission === '*:*:*') {
    return [...allPermissions];
  }

  return allPermissions.filter(perm =>
    matchesPermission(wildcardPermission, perm),
  );
}

/**
 * Validate permission string format
 *
 * @param permission - Permission string to validate
 * @returns true if valid format (feature:resource:action)
 */
export function isValidPermission(permission: string): boolean {
  if (!permission || typeof permission !== 'string') {
    return false;
  }

  const parts = permission.split(':');

  // Must have exactly 3 parts
  if (parts.length !== 3) {
    return false;
  }

  // Each part must be non-empty
  return parts.every(part => part.length > 0);
}

/**
 * Parse permission string into components
 *
 * @param permission - Permission string
 * @returns Object with feature, resource, and action
 */
export function parsePermission(permission: string): {
  feature: string;
  resource: string;
  action: string;
} | null {
  if (!isValidPermission(permission)) {
    return null;
  }

  const [feature, resource, action] = permission.split(':');

  return { feature, resource, action };
}

/**
 * Build permission string from components
 *
 * @param feature - Feature name
 * @param resource - Resource name
 * @param action - Action name
 * @returns Permission string
 */
export function buildPermission(
  feature: string,
  resource: string,
  action: string,
): string {
  return `${feature}:${resource}:${action}`;
}

/**
 * Get the feature from a permission string
 *
 * @param permission - Permission string
 * @returns Feature name or null if invalid
 */
export function getFeature(permission: string): string | null {
  const parsed = parsePermission(permission);
  return parsed ? parsed.feature : null;
}

/**
 * Get the resource from a permission string
 *
 * @param permission - Permission string
 * @returns Resource name or null if invalid
 */
export function getResource(permission: string): string | null {
  const parsed = parsePermission(permission);
  return parsed ? parsed.resource : null;
}

/**
 * Get the action from a permission string
 *
 * @param permission - Permission string
 * @returns Action name or null if invalid
 */
export function getAction(permission: string): string | null {
  const parsed = parsePermission(permission);
  return parsed ? parsed.action : null;
}

/**
 * Check if permission is a wildcard
 *
 * @param permission - Permission string
 * @returns true if contains any wildcards
 */
export function isWildcard(permission: string): boolean {
  return permission.includes('*');
}

/**
 * Get wildcard specificity level (higher = more specific)
 *
 * @param permission - Permission string
 * @returns Specificity level (0-3)
 *
 * @example
 * getWildcardSpecificity('*:*:*') // 0 (least specific)
 * getWildcardSpecificity('documents:*:*') // 1
 * getWildcardSpecificity('documents:drawing:*') // 2
 * getWildcardSpecificity('documents:drawing:read') // 3 (most specific)
 */
export function getWildcardSpecificity(permission: string): number {
  if (!isValidPermission(permission)) {
    return -1;
  }

  const parts = permission.split(':');
  let specificity = 0;

  for (const part of parts) {
    if (part !== '*') {
      specificity++;
    }
  }

  return specificity;
}

/**
 * Sort permissions by specificity (most specific first)
 * Useful for determining which permission takes precedence
 *
 * @param permissions - Array of permissions to sort
 * @returns Sorted array (most specific first)
 */
export function sortBySpecificity(permissions: string[]): string[] {
  return [...permissions].sort((a, b) => {
    const specificityA = getWildcardSpecificity(a);
    const specificityB = getWildcardSpecificity(b);
    return specificityB - specificityA;
  });
}

/**
 * Remove redundant permissions (covered by wildcards)
 * Optimizes permission lists
 *
 * @param permissions - Array of permissions
 * @returns Minimized array with redundant permissions removed
 *
 * @example
 * minimizePermissions(['documents:*:*', 'documents:drawing:read'])
 * // Returns: ['documents:*:*'] (drawing:read is covered by *)
 */
export function minimizePermissions(permissions: string[]): string[] {
  if (permissions.includes('*:*:*')) {
    return ['*:*:*'];
  }

  const minimized: string[] = [];

  for (const perm of permissions) {
    // Check if this permission is already covered by a permission in minimized
    const alreadyCovered = minimized.some(existing =>
      matchesPermission(existing, perm),
    );

    if (!alreadyCovered) {
      // Remove any permissions in minimized that are covered by this one
      const notCoveredByNew = minimized.filter(
        existing => !matchesPermission(perm, existing),
      );
      minimized.length = 0;
      minimized.push(...notCoveredByNew, perm);
    }
  }

  return minimized;
}

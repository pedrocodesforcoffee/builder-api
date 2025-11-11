/**
 * Scope Matching Utilities
 *
 * Handles scope-based access control for roles with scope limitations
 * (FOREMAN, SUBCONTRACTOR)
 *
 * Scope formats:
 * - Array: ["electrical", "plumbing"]
 * - Object: { trades: ["electrical"], floors: ["1", "2"] }
 */

import { ScopeAccessResult } from '../types/permission.types';

/**
 * Check if user has access based on scope matching
 *
 * @param userScope - User's assigned scope (array or object)
 * @param resourceScope - Resource's scope tags (array or object)
 * @returns Scope access result with details
 *
 * Rules:
 * 1. If userScope is null/empty, deny access
 * 2. If resourceScope is null/empty, deny access (explicit tagging required)
 * 3. If any user scope matches any resource scope, allow access
 */
export function checkScopeAccess(
  userScope: string[] | Record<string, string[]> | null | undefined,
  resourceScope: string[] | Record<string, string[]> | null | undefined,
): ScopeAccessResult {
  // Normalize scopes to arrays
  const userScopeArray = normalizeScopeToArray(userScope);
  const resourceScopeArray = normalizeScopeToArray(resourceScope);

  // Empty user scope = no access
  if (userScopeArray.length === 0) {
    return {
      hasAccess: false,
      userScope: userScopeArray,
      resourceScope: resourceScopeArray,
      matchedScopes: [],
    };
  }

  // Empty resource scope = no access (explicit tagging required)
  if (resourceScopeArray.length === 0) {
    return {
      hasAccess: false,
      userScope: userScopeArray,
      resourceScope: resourceScopeArray,
      matchedScopes: [],
    };
  }

  // Find matching scopes
  const matchedScopes = userScopeArray.filter(userTag =>
    resourceScopeArray.includes(userTag),
  );

  return {
    hasAccess: matchedScopes.length > 0,
    userScope: userScopeArray,
    resourceScope: resourceScopeArray,
    matchedScopes,
  };
}

/**
 * Normalize scope to flat array of strings
 *
 * @param scope - Scope in array or object format
 * @returns Flat array of scope tags
 *
 * @example
 * normalizeScopeToArray(['electrical', 'plumbing'])
 * // Returns: ['electrical', 'plumbing']
 *
 * normalizeScopeToArray({ trades: ['electrical'], floors: ['1', '2'] })
 * // Returns: ['electrical', '1', '2']
 */
export function normalizeScopeToArray(
  scope: string[] | Record<string, string[]> | null | undefined,
): string[] {
  if (!scope) {
    return [];
  }

  if (Array.isArray(scope)) {
    return scope.filter(item => typeof item === 'string' && item.length > 0);
  }

  if (typeof scope === 'object') {
    const result: string[] = [];

    for (const key in scope) {
      const value = scope[key];
      if (Array.isArray(value)) {
        result.push(
          ...value.filter(item => typeof item === 'string' && item.length > 0),
        );
      }
    }

    return result;
  }

  return [];
}

/**
 * Check if user scope includes specific tag
 *
 * @param userScope - User's assigned scope
 * @param tag - Tag to check for
 * @returns true if user has access to this tag
 */
export function hasScopeTag(
  userScope: string[] | Record<string, string[]> | null | undefined,
  tag: string,
): boolean {
  const scopeArray = normalizeScopeToArray(userScope);
  return scopeArray.includes(tag);
}

/**
 * Check if user scope includes specific tag in specific category
 *
 * @param userScope - User's assigned scope (object format)
 * @param category - Category key (e.g., 'trades', 'floors')
 * @param tag - Tag to check for
 * @returns true if user has access to this tag in this category
 *
 * @example
 * hasScope TagInCategory({ trades: ['electrical'] }, 'trades', 'electrical') // true
 * hasScopeTagInCategory({ trades: ['electrical'] }, 'trades', 'plumbing') // false
 */
export function hasScopeTagInCategory(
  userScope: string[] | Record<string, string[]> | null | undefined,
  category: string,
  tag: string,
): boolean {
  if (!userScope || Array.isArray(userScope)) {
    return false;
  }

  if (typeof userScope !== 'object') {
    return false;
  }

  const categoryTags = userScope[category];
  if (!Array.isArray(categoryTags)) {
    return false;
  }

  return categoryTags.includes(tag);
}

/**
 * Get all scope tags from scope (flattened)
 *
 * @param scope - Scope in any format
 * @returns Array of all tags
 */
export function getAllScopeTags(
  scope: string[] | Record<string, string[]> | null | undefined,
): string[] {
  return normalizeScopeToArray(scope);
}

/**
 * Merge multiple scopes into one
 *
 * @param scopes - Array of scopes to merge
 * @returns Merged scope as array
 *
 * @example
 * mergeScopes([['electrical'], ['plumbing']])
 * // Returns: ['electrical', 'plumbing']
 */
export function mergeScopes(
  scopes: (string[] | Record<string, string[]> | null | undefined)[],
): string[] {
  const allTags: Set<string> = new Set();

  for (const scope of scopes) {
    const tags = normalizeScopeToArray(scope);
    tags.forEach(tag => allTags.add(tag));
  }

  return Array.from(allTags);
}

/**
 * Check if two scopes have any overlap
 *
 * @param scope1 - First scope
 * @param scope2 - Second scope
 * @returns true if scopes have any common tags
 */
export function scopesOverlap(
  scope1: string[] | Record<string, string[]> | null | undefined,
  scope2: string[] | Record<string, string[]> | null | undefined,
): boolean {
  const tags1 = normalizeScopeToArray(scope1);
  const tags2 = normalizeScopeToArray(scope2);

  return tags1.some(tag => tags2.includes(tag));
}

/**
 * Filter resources by scope access
 *
 * @param userScope - User's assigned scope
 * @param resources - Array of resources with scope property
 * @returns Filtered array of resources user has access to
 *
 * @example
 * filterByScope(
 *   ['electrical'],
 *   [
 *     { id: '1', scope: ['electrical'] },
 *     { id: '2', scope: ['plumbing'] }
 *   ]
 * )
 * // Returns: [{ id: '1', scope: ['electrical'] }]
 */
export function filterByScope<
  T extends { scope?: string[] | Record<string, string[]> | null },
>(
  userScope: string[] | Record<string, string[]> | null | undefined,
  resources: T[],
): T[] {
  const userScopeArray = normalizeScopeToArray(userScope);

  // Empty user scope = no access to anything
  if (userScopeArray.length === 0) {
    return [];
  }

  return resources.filter(resource => {
    // Resource without scope = no access (explicit tagging required)
    if (!resource.scope) {
      return false;
    }

    const result = checkScopeAccess(userScope, resource.scope);
    return result.hasAccess;
  });
}

/**
 * Validate scope format
 *
 * @param scope - Scope to validate
 * @returns true if valid scope format
 */
export function isValidScope(
  scope: any,
): scope is string[] | Record<string, string[]> {
  if (!scope) {
    return true; // null/undefined is valid (no scope)
  }

  if (Array.isArray(scope)) {
    // Must be non-empty array of strings
    if (scope.length === 0) {
      return false;
    }
    return scope.every(item => typeof item === 'string' && item.length > 0);
  }

  if (typeof scope === 'object') {
    // Must be non-empty object with array values
    const keys = Object.keys(scope);
    if (keys.length === 0) {
      return false;
    }

    return keys.every(key => {
      const value = scope[key];
      if (!Array.isArray(value) || value.length === 0) {
        return false;
      }
      return value.every(
        item => typeof item === 'string' && item.length > 0,
      );
    });
  }

  return false;
}

/**
 * Get scope categories from object format scope
 *
 * @param scope - Scope in object format
 * @returns Array of category names
 *
 * @example
 * getScopeCategories({ trades: ['electrical'], floors: ['1'] })
 * // Returns: ['trades', 'floors']
 */
export function getScopeCategories(
  scope: Record<string, string[]> | null | undefined,
): string[] {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) {
    return [];
  }

  return Object.keys(scope);
}

/**
 * Get tags for a specific category
 *
 * @param scope - Scope in object format
 * @param category - Category name
 * @returns Array of tags in that category
 */
export function getScopeCategoryTags(
  scope: Record<string, string[]> | null | undefined,
  category: string,
): string[] {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) {
    return [];
  }

  const tags = scope[category];
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter(tag => typeof tag === 'string' && tag.length > 0);
}

/**
 * Convert array scope to object scope
 *
 * @param arrayScope - Scope in array format
 * @param category - Category name for the object (default: 'tags')
 * @returns Scope in object format
 *
 * @example
 * arrayToObjectScope(['electrical', 'plumbing'], 'trades')
 * // Returns: { trades: ['electrical', 'plumbing'] }
 */
export function arrayToObjectScope(
  arrayScope: string[],
  category: string = 'tags',
): Record<string, string[]> {
  return {
    [category]: arrayScope,
  };
}

/**
 * Create scope query for database filtering
 * Useful for constructing TypeORM queries
 *
 * @param userScope - User's assigned scope
 * @returns Object with scope matching logic
 */
export function createScopeQuery(
  userScope: string[] | Record<string, string[]> | null | undefined,
): {
  shouldFilter: boolean;
  tags: string[];
} {
  const tags = normalizeScopeToArray(userScope);

  return {
    shouldFilter: tags.length > 0,
    tags,
  };
}

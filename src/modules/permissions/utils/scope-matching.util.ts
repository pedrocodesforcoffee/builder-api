/**
 * Enhanced Scope Matching Utilities
 *
 * Multi-dimensional scope matching with hierarchical area support
 * Supports: trades, areas, phases, tags
 */

import {
  UserScope,
  ResourceScope,
  ScopeMatchResult,
  ScopeValidationResult,
} from '../types/scope.types';
import {
  getDefaultVisibility,
  DEFAULT_SCOPE_VALIDATION_RULES,
  ScopeValidationRules,
  doesRoleRequireScope,
  canRoleHaveScope,
  SCOPE_EXEMPT_ROLES,
} from '../constants/scope-config.constants';
import { ProjectRole } from '../../users/enums/project-role.enum';

/**
 * Check if user scope matches resource scope
 *
 * Matching Rules:
 * 1. Null/undefined user scope = full access (not scope-limited)
 * 2. Empty user scope = no access (restricted but no matches)
 * 3. Empty/null resource scope = depends on visibility
 * 4. Any dimension match = access granted (OR logic)
 * 5. Areas use hierarchical matching (parent grants child access)
 *
 * @param userScope - User's assigned scope
 * @param resourceScope - Resource's scope tags
 * @param resourceType - Type of resource (affects default visibility)
 * @returns Match result with details
 */
export function matchesScope(
  userScope: UserScope | null | undefined,
  resourceScope: ResourceScope | null | undefined,
  resourceType: string = 'document',
): ScopeMatchResult {
  // Rule 1: Null/undefined user scope = full access
  if (!userScope) {
    return {
      hasAccess: true,
      reason: 'User has no scope restrictions',
    };
  }

  // Rule 2: Empty user scope = no access
  if (isScopeEmpty(userScope)) {
    return {
      hasAccess: false,
      reason: 'User has empty scope (no access)',
    };
  }

  // Rule 3: Empty/null resource scope = check visibility
  if (!resourceScope || isScopeEmpty(resourceScope)) {
    const visibility =
      resourceScope?.visibility || getDefaultVisibility(resourceType);

    if (visibility === 'public') {
      return {
        hasAccess: true,
        matchedDimension: 'public',
        reason: 'Resource is publicly visible',
      };
    } else {
      return {
        hasAccess: false,
        reason: 'Resource has no scope tags and is tagged-only',
      };
    }
  }

  // Rule 4: Check for any dimension match (OR logic)
  const dimensions: Array<'trades' | 'areas' | 'phases' | 'tags'> = [
    'trades',
    'areas',
    'phases',
    'tags',
  ];

  for (const dimension of dimensions) {
    const userValues = userScope[dimension] || [];
    const resourceValues = resourceScope[dimension] || [];

    // Skip if either side has no values for this dimension
    if (userValues.length === 0 || resourceValues.length === 0) {
      continue;
    }

    // Rule 5: Use hierarchical matching for areas
    if (dimension === 'areas') {
      const hierarchicalMatch = hasHierarchicalMatch(
        userValues,
        resourceValues,
      );
      if (hierarchicalMatch.hasMatch) {
        return {
          hasAccess: true,
          matchedDimension: dimension,
          matchedValues: hierarchicalMatch.matchedValues,
          reason: `Matched ${dimension}: ${hierarchicalMatch.matchedValues.join(', ')}`,
        };
      }
    } else {
      // Use exact matching for other dimensions
      const exactMatch = hasArrayIntersection(userValues, resourceValues);
      if (exactMatch.hasMatch) {
        return {
          hasAccess: true,
          matchedDimension: dimension,
          matchedValues: exactMatch.matchedValues,
          reason: `Matched ${dimension}: ${exactMatch.matchedValues.join(', ')}`,
        };
      }
    }
  }

  // Rule 6: No matches found
  return {
    hasAccess: false,
    reason: 'No scope dimension matches',
  };
}

/**
 * Check if a scope object is empty (all arrays empty or undefined)
 */
export function isScopeEmpty(scope: UserScope | ResourceScope): boolean {
  return (
    (!scope.trades || scope.trades.length === 0) &&
    (!scope.areas || scope.areas.length === 0) &&
    (!scope.phases || scope.phases.length === 0) &&
    (!scope.tags || scope.tags.length === 0)
  );
}

/**
 * Check for array intersection (case-insensitive)
 */
function hasArrayIntersection(
  arr1: string[],
  arr2: string[],
): { hasMatch: boolean; matchedValues: string[] } {
  const set1 = new Set(arr1.map((s) => s.toLowerCase().trim()));
  const matchedValues: string[] = [];

  for (const item of arr2) {
    const normalized = item.toLowerCase().trim();
    if (set1.has(normalized)) {
      matchedValues.push(item);
    }
  }

  return {
    hasMatch: matchedValues.length > 0,
    matchedValues,
  };
}

/**
 * Check for hierarchical area matching
 *
 * A user with area "building-a" can access resources in:
 * - "building-a" (exact match)
 * - "building-a-floor-3" (child area)
 * - "building-a-floor-3-room-301" (descendant area)
 *
 * But NOT:
 * - "building-b" (different area)
 * - "building" (parent area - user has narrower scope)
 */
function hasHierarchicalMatch(
  userAreas: string[],
  resourceAreas: string[],
): { hasMatch: boolean; matchedValues: string[] } {
  const matchedValues: string[] = [];

  for (const userArea of userAreas) {
    const userAreaNormalized = userArea.toLowerCase().trim();

    for (const resourceArea of resourceAreas) {
      const resourceAreaNormalized = resourceArea.toLowerCase().trim();

      // Exact match
      if (resourceAreaNormalized === userAreaNormalized) {
        matchedValues.push(resourceArea);
        continue;
      }

      // Check if resource area is child of user area
      // e.g., user: "building-a", resource: "building-a-floor-3"
      if (
        resourceAreaNormalized.startsWith(userAreaNormalized + '-') ||
        resourceAreaNormalized.startsWith(userAreaNormalized + '/')
      ) {
        matchedValues.push(resourceArea);
      }
    }
  }

  return {
    hasMatch: matchedValues.length > 0,
    matchedValues,
  };
}

/**
 * Validate scope assignment for a role
 *
 * @param role - Project role
 * @param scope - Scope to validate
 * @param rules - Validation rules (optional, uses defaults)
 * @returns Validation result
 */
export function validateScopeForRole(
  role: ProjectRole,
  scope: UserScope | null,
  rules: ScopeValidationRules = DEFAULT_SCOPE_VALIDATION_RULES,
): ScopeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if role cannot have scope
  if (SCOPE_EXEMPT_ROLES.includes(role)) {
    if (scope && !isScopeEmpty(scope)) {
      errors.push(
        `${role} cannot have scope restrictions (always has full access)`,
      );
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // Check if role requires scope
  if (doesRoleRequireScope(role)) {
    if (!scope || isScopeEmpty(scope)) {
      errors.push(
        `${role} requires scope assignment (trades, areas, phases, or tags)`,
      );
      return { valid: false, errors, warnings };
    }
  }

  // Check if role can have scope
  if (!canRoleHaveScope(role)) {
    if (scope && !isScopeEmpty(scope)) {
      errors.push(`${role} should not have scope restrictions`);
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // If no scope provided and not required, that's valid
  if (!scope) {
    return { valid: true, errors: [], warnings };
  }

  // Validate scope breadth
  if (scope.trades && scope.trades.length > rules.maxTrades) {
    errors.push(
      `Too many trades assigned (${scope.trades.length}/${rules.maxTrades})`,
    );
  }

  if (scope.areas && scope.areas.length > rules.maxAreas) {
    errors.push(
      `Too many areas assigned (${scope.areas.length}/${rules.maxAreas})`,
    );
  }

  if (scope.phases && scope.phases.length > rules.maxPhases) {
    errors.push(
      `Too many phases assigned (${scope.phases.length}/${rules.maxPhases})`,
    );
  }

  if (scope.tags && scope.tags.length > rules.maxTags) {
    errors.push(
      `Too many tags assigned (${scope.tags.length}/${rules.maxTags})`,
    );
  }

  // Validate scope values are not empty strings
  const allValues = [
    ...(scope.trades || []),
    ...(scope.areas || []),
    ...(scope.phases || []),
    ...(scope.tags || []),
  ];

  const emptyValues = allValues.filter((v) => !v || v.trim() === '');
  if (emptyValues.length > 0) {
    errors.push('Scope values cannot be empty strings');
  }

  // Warning if scope is too broad (many dimensions with many values)
  const dimensionCount = [
    scope.trades?.length || 0,
    scope.areas?.length || 0,
    scope.phases?.length || 0,
    scope.tags?.length || 0,
  ].filter((count) => count > 0).length;

  const totalValues = allValues.length;

  if (dimensionCount >= 3 && totalValues > 15) {
    warnings.push(
      'Scope is very broad (multiple dimensions with many values). Consider narrowing scope for clarity.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Merge multiple user scopes (for future use with team/group scopes)
 *
 * Creates a union of all scope values
 */
export function mergeScopes(...scopes: (UserScope | null)[]): UserScope | null {
  const validScopes = scopes.filter(
    (s): s is UserScope => s !== null && s !== undefined,
  );

  if (validScopes.length === 0) {
    return null;
  }

  const merged: UserScope = {
    trades: [],
    areas: [],
    phases: [],
    tags: [],
  };

  for (const scope of validScopes) {
    if (scope.trades) {
      merged.trades = [...new Set([...merged.trades!, ...scope.trades])];
    }
    if (scope.areas) {
      merged.areas = [...new Set([...merged.areas!, ...scope.areas])];
    }
    if (scope.phases) {
      merged.phases = [...new Set([...merged.phases!, ...scope.phases])];
    }
    if (scope.tags) {
      merged.tags = [...new Set([...merged.tags!, ...scope.tags])];
    }
  }

  return merged;
}

/**
 * Check if one scope is a subset of another
 *
 * Returns true if scope1 is completely contained within scope2
 */
export function isScopeSubset(
  scope1: UserScope | null,
  scope2: UserScope | null,
): boolean {
  if (!scope1) {
    return true; // null scope is subset of anything
  }
  if (!scope2) {
    return false; // non-null cannot be subset of null
  }

  const dimensions: Array<keyof UserScope> = ['trades', 'areas', 'phases', 'tags'];

  for (const dimension of dimensions) {
    const values1 = scope1[dimension] || [];
    const values2 = scope2[dimension] || [];

    if (values1.length > 0) {
      // Check if all values in scope1 are in scope2
      const set2 = new Set(
        (values2 as string[]).map((v) => v.toLowerCase().trim()),
      );
      const allInScope2 = (values1 as string[]).every((v) =>
        set2.has(v.toLowerCase().trim()),
      );

      if (!allInScope2) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get scope summary for display
 */
export function getScopeSummary(scope: UserScope | null): string {
  if (!scope || isScopeEmpty(scope)) {
    return 'No restrictions';
  }

  const parts: string[] = [];

  if (scope.trades && scope.trades.length > 0) {
    parts.push(
      `${scope.trades.length} trade${scope.trades.length > 1 ? 's' : ''}`,
    );
  }

  if (scope.areas && scope.areas.length > 0) {
    parts.push(
      `${scope.areas.length} area${scope.areas.length > 1 ? 's' : ''}`,
    );
  }

  if (scope.phases && scope.phases.length > 0) {
    parts.push(
      `${scope.phases.length} phase${scope.phases.length > 1 ? 's' : ''}`,
    );
  }

  if (scope.tags && scope.tags.length > 0) {
    parts.push(`${scope.tags.length} tag${scope.tags.length > 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}

/**
 * Filter resources by scope
 *
 * @param userScope - User's scope
 * @param resources - Resources to filter
 * @param getScopeFromResource - Function to extract scope from resource
 * @param resourceType - Resource type for visibility rules
 * @returns Filtered resources
 */
export function filterResourcesByScope<T>(
  userScope: UserScope | null,
  resources: T[],
  getScopeFromResource: (resource: T) => ResourceScope | null | undefined,
  resourceType: string = 'document',
): T[] {
  return resources.filter((resource) => {
    const resourceScope = getScopeFromResource(resource);
    const match = matchesScope(userScope, resourceScope, resourceType);
    return match.hasAccess;
  });
}

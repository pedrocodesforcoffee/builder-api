/**
 * Scope Types
 *
 * Defines types for scope-based access control
 */

/**
 * User Scope - Defines what a user can access
 */
export interface UserScope {
  // Trade-based scope (for subcontractors, specialized workers)
  trades?: string[];

  // Area/Location-based scope (for foremen, site managers)
  areas?: string[];

  // Phase-based scope (for phase-specific contractors)
  phases?: string[];

  // Custom tags (flexible categorization)
  tags?: string[];

  // Metadata
  assignedBy?: string;
  assignedAt?: Date;
  reason?: string;
}

/**
 * Resource Scope - Defines what scope tags a resource has
 */
export interface ResourceScope {
  // Trade tags
  trades?: string[];

  // Area/Location tags
  areas?: string[];

  // Phase tags
  phases?: string[];

  // Custom tags
  tags?: string[];

  // Visibility (who can see untagged resources)
  visibility?: 'public' | 'tagged-only';
}

/**
 * Scope matching result
 */
export interface ScopeMatchResult {
  hasAccess: boolean;
  matchedDimension?: 'trades' | 'areas' | 'phases' | 'tags' | 'public';
  matchedValues?: string[];
  reason?: string;
}

/**
 * Scope validation result
 */
export interface ScopeValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Scope option for UI
 */
export interface ScopeOption {
  value: string;
  label: string;
  description?: string;
  usageCount: number;
  category?: string;
}

/**
 * Scope options for a project
 */
export interface ScopeOptions {
  trades: ScopeOption[];
  areas: ScopeOption[];
  phases: ScopeOption[];
  tags: ScopeOption[];
}

/**
 * Scope statistics for reporting
 */
export interface ScopeStatistics {
  projectId: string;
  totalScopedUsers: number;
  totalScopedResources: number;

  usersByScope: {
    trades: Record<string, number>;
    areas: Record<string, number>;
    phases: Record<string, number>;
  };

  resourcesByScope: {
    trades: Record<string, number>;
    areas: Record<string, number>;
    phases: Record<string, number>;
  };

  unmatchedScopes: {
    // Users with scope that matches no resources
    users: Array<{
      userId: string;
      userName: string;
      scope: UserScope;
      resourceCount: number;
    }>;

    // Resources with scope that no user can access
    resources: Array<{
      resourceId: string;
      resourceType: string;
      scope: ResourceScope;
      accessibleByCount: number;
    }>;
  };
}

/**
 * Scope usage count
 */
export interface ScopeUsageCounts {
  trades: Record<string, number>;
  areas: Record<string, number>;
  phases: Record<string, number>;
  tags: Record<string, number>;
}

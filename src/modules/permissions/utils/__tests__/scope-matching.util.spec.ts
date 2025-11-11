/**
 * Scope Matching Utilities Tests
 */

import {
  matchesScope,
  validateScopeForRole,
  isScopeEmpty,
  mergeScopes,
  isScopeSubset,
  getScopeSummary,
  filterResourcesByScope,
} from '../scope-matching.util';
import { UserScope, ResourceScope } from '../../types/scope.types';
import { ProjectRole } from '../../../users/enums/project-role.enum';

describe('Scope Matching Utilities', () => {
  describe('matchesScope', () => {
    describe('Rule 1: null user scope grants full access', () => {
      it('should grant access when user scope is null', () => {
        const result = matchesScope(
          null,
          { trades: ['electrical'] },
          'document',
        );

        expect(result.hasAccess).toBe(true);
        expect(result.reason).toContain('no scope restrictions');
      });

      it('should grant access when user scope is undefined', () => {
        const result = matchesScope(
          undefined,
          { trades: ['electrical'] },
          'document',
        );

        expect(result.hasAccess).toBe(true);
      });
    });

    describe('Rule 2: empty user scope denies all access', () => {
      it('should deny access when user has empty scope', () => {
        const userScope: UserScope = {
          trades: [],
          areas: [],
          phases: [],
          tags: [],
        };

        const result = matchesScope(
          userScope,
          { trades: ['electrical'] },
          'document',
        );

        expect(result.hasAccess).toBe(false);
        expect(result.reason).toContain('empty scope');
      });
    });

    describe('Rule 3: empty/null resource scope behavior', () => {
      it('should grant access to public resources', () => {
        const userScope: UserScope = { trades: ['electrical'] };
        const resourceScope: ResourceScope = { visibility: 'public' };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
        expect(result.matchedDimension).toBe('public');
      });

      it('should deny access to tagged-only resources without tags', () => {
        const userScope: UserScope = { trades: ['electrical'] };
        const resourceScope: ResourceScope = { visibility: 'tagged-only' };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(false);
        expect(result.reason).toContain('no scope tags');
      });

      it('should use default visibility for resource type', () => {
        const userScope: UserScope = { trades: ['electrical'] };

        // Document defaults to tagged-only
        const resultDoc = matchesScope(userScope, {}, 'document');
        expect(resultDoc.hasAccess).toBe(false);

        // Daily-report defaults to public
        const resultReport = matchesScope(userScope, {}, 'daily-report');
        expect(resultReport.hasAccess).toBe(true);
      });
    });

    describe('Rule 4: any dimension match grants access (OR logic)', () => {
      it('should grant access when trade matches', () => {
        const userScope: UserScope = {
          trades: ['electrical', 'lighting'],
        };
        const resourceScope: ResourceScope = {
          trades: ['electrical', 'hvac'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
        expect(result.matchedDimension).toBe('trades');
        expect(result.matchedValues).toContain('electrical');
      });

      it('should deny access when no trade matches', () => {
        const userScope: UserScope = {
          trades: ['plumbing'],
        };
        const resourceScope: ResourceScope = {
          trades: ['electrical', 'hvac'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(false);
        expect(result.reason).toContain('No scope dimension matches');
      });

      it('should grant access when phase matches (different trade)', () => {
        const userScope: UserScope = {
          trades: ['electrical'],
          phases: ['rough-in'],
        };
        const resourceScope: ResourceScope = {
          trades: ['plumbing'],
          phases: ['rough-in'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
        expect(result.matchedDimension).toBe('phases');
      });

      it('should deny access when no dimension matches', () => {
        const userScope: UserScope = {
          trades: ['electrical'],
          phases: ['rough-in'],
        };
        const resourceScope: ResourceScope = {
          trades: ['plumbing'],
          phases: ['trim-out'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(false);
      });

      it('should handle case-insensitive matching', () => {
        const userScope: UserScope = {
          trades: ['ELECTRICAL'],
        };
        const resourceScope: ResourceScope = {
          trades: ['electrical'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
      });
    });

    describe('Rule 5: hierarchical area matching', () => {
      it('should match exact area', () => {
        const userScope: UserScope = {
          areas: ['building-a'],
        };
        const resourceScope: ResourceScope = {
          areas: ['building-a'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
        expect(result.matchedDimension).toBe('areas');
      });

      it('should match child area (user has parent)', () => {
        const userScope: UserScope = {
          areas: ['building-a'],
        };
        const resourceScope: ResourceScope = {
          areas: ['building-a-floor-3'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
        expect(result.matchedValues).toContain('building-a-floor-3');
      });

      it('should match deeply nested child area', () => {
        const userScope: UserScope = {
          areas: ['building-a'],
        };
        const resourceScope: ResourceScope = {
          areas: ['building-a-floor-3-room-301'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
      });

      it('should NOT match parent area (user has child)', () => {
        const userScope: UserScope = {
          areas: ['building-a-floor-3'],
        };
        const resourceScope: ResourceScope = {
          areas: ['building-a'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(false);
      });

      it('should NOT match sibling areas', () => {
        const userScope: UserScope = {
          areas: ['building-a-floor-3'],
        };
        const resourceScope: ResourceScope = {
          areas: ['building-a-floor-4'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(false);
      });

      it('should support slash separator', () => {
        const userScope: UserScope = {
          areas: ['building-a/floor-3'],
        };
        const resourceScope: ResourceScope = {
          areas: ['building-a/floor-3/room-301'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
      });
    });

    describe('multi-dimensional matching', () => {
      it('should match on first dimension found', () => {
        const userScope: UserScope = {
          trades: ['electrical'],
          areas: ['building-a'],
          phases: ['rough-in'],
        };
        const resourceScope: ResourceScope = {
          trades: ['electrical'],
          areas: ['building-b'],
          phases: ['trim-out'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
        expect(result.matchedDimension).toBe('trades');
      });

      it('should skip empty dimensions', () => {
        const userScope: UserScope = {
          trades: [],
          areas: ['building-a'],
        };
        const resourceScope: ResourceScope = {
          trades: ['electrical'],
          areas: ['building-a'],
        };

        const result = matchesScope(userScope, resourceScope, 'document');

        expect(result.hasAccess).toBe(true);
        expect(result.matchedDimension).toBe('areas');
      });
    });
  });

  describe('validateScopeForRole', () => {
    describe('SUBCONTRACTOR role', () => {
      it('should require scope for SUBCONTRACTOR', () => {
        const result = validateScopeForRole(ProjectRole.SUBCONTRACTOR, null);

        expect(result.valid).toBe(false);
        expect(result.errors.some((err) => err.includes('requires scope'))).toBe(
          true,
        );
      });

      it('should accept valid scope for SUBCONTRACTOR', () => {
        const scope: UserScope = {
          trades: ['electrical'],
        };

        const result = validateScopeForRole(ProjectRole.SUBCONTRACTOR, scope);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('FOREMAN role', () => {
      it('should require scope for FOREMAN', () => {
        const result = validateScopeForRole(ProjectRole.FOREMAN, null);

        expect(result.valid).toBe(false);
        expect(result.errors.some((err) => err.includes('requires scope'))).toBe(
          true,
        );
      });

      it('should accept area-based scope for FOREMAN', () => {
        const scope: UserScope = {
          areas: ['building-a-floor-3'],
        };

        const result = validateScopeForRole(ProjectRole.FOREMAN, scope);

        expect(result.valid).toBe(true);
      });
    });

    describe('PROJECT_ADMIN role', () => {
      it('should not allow scope for PROJECT_ADMIN', () => {
        const scope: UserScope = {
          trades: ['electrical'],
        };

        const result = validateScopeForRole(ProjectRole.PROJECT_ADMIN, scope);

        expect(result.valid).toBe(false);
        expect(result.errors.some((err) => err.includes('cannot have scope'))).toBe(
          true,
        );
      });

      it('should allow null scope for PROJECT_ADMIN', () => {
        const result = validateScopeForRole(ProjectRole.PROJECT_ADMIN, null);

        expect(result.valid).toBe(true);
      });
    });

    describe('scope breadth validation', () => {
      it('should reject too many trades', () => {
        const scope: UserScope = {
          trades: Array(20).fill('trade'),
        };

        const result = validateScopeForRole(ProjectRole.SUBCONTRACTOR, scope);

        expect(result.valid).toBe(false);
        expect(result.errors.some((err) => err.includes('Too many trades'))).toBe(
          true,
        );
      });

      it('should reject empty string values', () => {
        const scope: UserScope = {
          trades: ['electrical', '', 'plumbing'],
        };

        const result = validateScopeForRole(ProjectRole.SUBCONTRACTOR, scope);

        expect(result.valid).toBe(false);
        expect(result.errors.some((err) => err.includes('empty strings'))).toBe(
          true,
        );
      });

      it('should warn about overly broad scope', () => {
        const scope: UserScope = {
          trades: Array(5).fill('trade'),
          areas: Array(5).fill('area'),
          phases: Array(3).fill('phase'),
          tags: Array(5).fill('tag'),
        };

        const result = validateScopeForRole(ProjectRole.SUBCONTRACTOR, scope);

        expect(result.warnings).toBeDefined();
        expect(result.warnings!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isScopeEmpty', () => {
    it('should return true for empty scope', () => {
      const scope: UserScope = {
        trades: [],
        areas: [],
        phases: [],
        tags: [],
      };

      expect(isScopeEmpty(scope)).toBe(true);
    });

    it('should return false for scope with trades', () => {
      const scope: UserScope = {
        trades: ['electrical'],
      };

      expect(isScopeEmpty(scope)).toBe(false);
    });

    it('should return false for scope with any dimension', () => {
      const scope: UserScope = {
        tags: ['important'],
      };

      expect(isScopeEmpty(scope)).toBe(false);
    });
  });

  describe('mergeScopes', () => {
    it('should merge multiple scopes', () => {
      const scope1: UserScope = {
        trades: ['electrical'],
      };
      const scope2: UserScope = {
        trades: ['plumbing'],
      };

      const merged = mergeScopes(scope1, scope2);

      expect(merged).not.toBeNull();
      expect(merged!.trades).toContain('electrical');
      expect(merged!.trades).toContain('plumbing');
    });

    it('should remove duplicates', () => {
      const scope1: UserScope = {
        trades: ['electrical'],
      };
      const scope2: UserScope = {
        trades: ['electrical'],
      };

      const merged = mergeScopes(scope1, scope2);

      expect(merged!.trades).toHaveLength(1);
    });

    it('should return null when all scopes are null', () => {
      const merged = mergeScopes(null, null);

      expect(merged).toBeNull();
    });
  });

  describe('isScopeSubset', () => {
    it('should return true when scope1 is subset of scope2', () => {
      const scope1: UserScope = {
        trades: ['electrical'],
      };
      const scope2: UserScope = {
        trades: ['electrical', 'plumbing'],
      };

      expect(isScopeSubset(scope1, scope2)).toBe(true);
    });

    it('should return false when scope1 is not subset of scope2', () => {
      const scope1: UserScope = {
        trades: ['electrical', 'hvac'],
      };
      const scope2: UserScope = {
        trades: ['electrical'],
      };

      expect(isScopeSubset(scope1, scope2)).toBe(false);
    });

    it('should return true when scope1 is null', () => {
      const scope2: UserScope = {
        trades: ['electrical'],
      };

      expect(isScopeSubset(null, scope2)).toBe(true);
    });
  });

  describe('getScopeSummary', () => {
    it('should return summary for scope with trades', () => {
      const scope: UserScope = {
        trades: ['electrical', 'lighting'],
      };

      const summary = getScopeSummary(scope);

      expect(summary).toContain('2 trades');
    });

    it('should return "No restrictions" for null scope', () => {
      const summary = getScopeSummary(null);

      expect(summary).toBe('No restrictions');
    });

    it('should return "No restrictions" for empty scope', () => {
      const scope: UserScope = {
        trades: [],
        areas: [],
      };

      const summary = getScopeSummary(scope);

      expect(summary).toBe('No restrictions');
    });

    it('should summarize multi-dimensional scope', () => {
      const scope: UserScope = {
        trades: ['electrical'],
        areas: ['building-a', 'building-b'],
        phases: ['rough-in'],
      };

      const summary = getScopeSummary(scope);

      expect(summary).toContain('1 trade');
      expect(summary).toContain('2 areas');
      expect(summary).toContain('1 phase');
    });
  });

  describe('filterResourcesByScope', () => {
    interface TestResource {
      id: string;
      scope?: ResourceScope;
    }

    it('should filter resources based on user scope', () => {
      const userScope: UserScope = {
        trades: ['electrical'],
      };

      const resources: TestResource[] = [
        { id: '1', scope: { trades: ['electrical'] } },
        { id: '2', scope: { trades: ['plumbing'] } },
        { id: '3', scope: { trades: ['electrical'] } },
      ];

      const filtered = filterResourcesByScope(
        userScope,
        resources,
        (r) => r.scope,
        'document',
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.id)).toEqual(['1', '3']);
    });

    it('should return all resources when user has no scope', () => {
      const resources: TestResource[] = [
        { id: '1', scope: { trades: ['electrical'] } },
        { id: '2', scope: { trades: ['plumbing'] } },
      ];

      const filtered = filterResourcesByScope(
        null,
        resources,
        (r) => r.scope,
        'document',
      );

      expect(filtered).toHaveLength(2);
    });

    it('should return empty when user has empty scope', () => {
      const userScope: UserScope = {
        trades: [],
        areas: [],
      };

      const resources: TestResource[] = [
        { id: '1', scope: { trades: ['electrical'] } },
      ];

      const filtered = filterResourcesByScope(
        userScope,
        resources,
        (r) => r.scope,
        'document',
      );

      expect(filtered).toHaveLength(0);
    });
  });
});

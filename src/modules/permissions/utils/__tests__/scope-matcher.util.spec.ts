/**
 * Scope Matcher Utility Tests
 */

import {
  checkScopeAccess,
  normalizeScopeToArray,
  hasScopeTag,
  hasScopeTagInCategory,
  getAllScopeTags,
  mergeScopes,
  scopesOverlap,
  filterByScope,
  isValidScope,
  getScopeCategories,
  getScopeCategoryTags,
  arrayToObjectScope,
  createScopeQuery,
} from '../scope-matcher.util';

describe('Scope Matcher Utility', () => {
  describe('checkScopeAccess', () => {
    it('should allow access when scopes match (array format)', () => {
      const userScope = ['electrical', 'plumbing'];
      const resourceScope = ['electrical', 'lighting'];
      const result = checkScopeAccess(userScope, resourceScope);
      expect(result.hasAccess).toBe(true);
      expect(result.matchedScopes).toEqual(['electrical']);
    });

    it('should deny access when scopes do not match', () => {
      const userScope = ['plumbing'];
      const resourceScope = ['electrical'];
      const result = checkScopeAccess(userScope, resourceScope);
      expect(result.hasAccess).toBe(false);
      expect(result.matchedScopes).toEqual([]);
    });

    it('should deny access with empty user scope', () => {
      const userScope: string[] = [];
      const resourceScope = ['electrical'];
      const result = checkScopeAccess(userScope, resourceScope);
      expect(result.hasAccess).toBe(false);
    });

    it('should deny access with empty resource scope', () => {
      const userScope = ['electrical'];
      const resourceScope: string[] = [];
      const result = checkScopeAccess(userScope, resourceScope);
      expect(result.hasAccess).toBe(false);
    });

    it('should deny access with null user scope', () => {
      const result = checkScopeAccess(null, ['electrical']);
      expect(result.hasAccess).toBe(false);
    });

    it('should deny access with null resource scope', () => {
      const result = checkScopeAccess(['electrical'], null);
      expect(result.hasAccess).toBe(false);
    });

    it('should work with object format scopes', () => {
      const userScope = { trades: ['electrical'], floors: ['1'] };
      const resourceScope = { trades: ['electrical', 'plumbing'] };
      const result = checkScopeAccess(userScope, resourceScope);
      expect(result.hasAccess).toBe(true);
      expect(result.matchedScopes).toEqual(['electrical']);
    });

    it('should work with mixed format scopes', () => {
      const userScope = ['electrical', 'lighting'];
      const resourceScope = { trades: ['electrical'] };
      const result = checkScopeAccess(userScope, resourceScope);
      expect(result.hasAccess).toBe(true);
    });

    it('should allow access with multiple matches', () => {
      const userScope = ['electrical', 'lighting', 'plumbing'];
      const resourceScope = ['lighting', 'hvac'];
      const result = checkScopeAccess(userScope, resourceScope);
      expect(result.hasAccess).toBe(true);
      expect(result.matchedScopes).toEqual(['lighting']);
    });
  });

  describe('normalizeScopeToArray', () => {
    it('should keep array scope as-is', () => {
      const scope = ['electrical', 'plumbing'];
      const result = normalizeScopeToArray(scope);
      expect(result).toEqual(['electrical', 'plumbing']);
    });

    it('should flatten object scope', () => {
      const scope = {
        trades: ['electrical', 'plumbing'],
        floors: ['1', '2'],
      };
      const result = normalizeScopeToArray(scope);
      expect(result).toEqual(['electrical', 'plumbing', '1', '2']);
    });

    it('should return empty array for null', () => {
      const result = normalizeScopeToArray(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      const result = normalizeScopeToArray(undefined);
      expect(result).toEqual([]);
    });

    it('should filter out empty strings', () => {
      const scope = ['electrical', '', 'plumbing'];
      const result = normalizeScopeToArray(scope);
      expect(result).toEqual(['electrical', 'plumbing']);
    });

    it('should filter out non-string values', () => {
      const scope = ['electrical', 123 as any, 'plumbing'];
      const result = normalizeScopeToArray(scope);
      expect(result).toEqual(['electrical', 'plumbing']);
    });
  });

  describe('hasScopeTag', () => {
    it('should return true if user has tag (array)', () => {
      const userScope = ['electrical', 'plumbing'];
      expect(hasScopeTag(userScope, 'electrical')).toBe(true);
    });

    it('should return false if user does not have tag', () => {
      const userScope = ['plumbing'];
      expect(hasScopeTag(userScope, 'electrical')).toBe(false);
    });

    it('should work with object scope', () => {
      const userScope = { trades: ['electrical'] };
      expect(hasScopeTag(userScope, 'electrical')).toBe(true);
    });

    it('should return false for null scope', () => {
      expect(hasScopeTag(null, 'electrical')).toBe(false);
    });
  });

  describe('hasScopeTagInCategory', () => {
    it('should return true if user has tag in category', () => {
      const userScope = { trades: ['electrical'], floors: ['1'] };
      expect(hasScopeTagInCategory(userScope, 'trades', 'electrical')).toBe(
        true,
      );
    });

    it('should return false if user does not have tag in category', () => {
      const userScope = { trades: ['plumbing'] };
      expect(hasScopeTagInCategory(userScope, 'trades', 'electrical')).toBe(
        false,
      );
    });

    it('should return false for non-existent category', () => {
      const userScope = { trades: ['electrical'] };
      expect(hasScopeTagInCategory(userScope, 'floors', '1')).toBe(false);
    });

    it('should return false for array scope', () => {
      const userScope = ['electrical'];
      expect(hasScopeTagInCategory(userScope, 'trades', 'electrical')).toBe(
        false,
      );
    });

    it('should return false for null scope', () => {
      expect(hasScopeTagInCategory(null, 'trades', 'electrical')).toBe(false);
    });
  });

  describe('getAllScopeTags', () => {
    it('should return all tags from array scope', () => {
      const scope = ['electrical', 'plumbing'];
      const result = getAllScopeTags(scope);
      expect(result).toEqual(['electrical', 'plumbing']);
    });

    it('should return all tags from object scope', () => {
      const scope = { trades: ['electrical'], floors: ['1', '2'] };
      const result = getAllScopeTags(scope);
      expect(result).toEqual(['electrical', '1', '2']);
    });

    it('should return empty array for null', () => {
      const result = getAllScopeTags(null);
      expect(result).toEqual([]);
    });
  });

  describe('mergeScopes', () => {
    it('should merge multiple scopes', () => {
      const scopes = [
        ['electrical'],
        ['plumbing'],
        ['hvac'],
      ];
      const result = mergeScopes(scopes);
      expect(result.sort()).toEqual(['electrical', 'hvac', 'plumbing']);
    });

    it('should deduplicate tags', () => {
      const scopes = [
        ['electrical', 'plumbing'],
        ['electrical', 'hvac'],
      ];
      const result = mergeScopes(scopes);
      expect(result.sort()).toEqual(['electrical', 'hvac', 'plumbing']);
    });

    it('should handle object scopes', () => {
      const scopes = [
        { trades: ['electrical'] },
        { floors: ['1', '2'] },
      ];
      const result = mergeScopes(scopes);
      expect(result.sort()).toEqual(['1', '2', 'electrical']);
    });

    it('should handle null scopes', () => {
      const scopes = [['electrical'], null, ['plumbing']];
      const result = mergeScopes(scopes);
      expect(result.sort()).toEqual(['electrical', 'plumbing']);
    });
  });

  describe('scopesOverlap', () => {
    it('should return true when scopes overlap', () => {
      const scope1 = ['electrical', 'plumbing'];
      const scope2 = ['electrical', 'hvac'];
      expect(scopesOverlap(scope1, scope2)).toBe(true);
    });

    it('should return false when scopes do not overlap', () => {
      const scope1 = ['plumbing'];
      const scope2 = ['electrical'];
      expect(scopesOverlap(scope1, scope2)).toBe(false);
    });

    it('should work with object scopes', () => {
      const scope1 = { trades: ['electrical'] };
      const scope2 = { trades: ['electrical', 'plumbing'] };
      expect(scopesOverlap(scope1, scope2)).toBe(true);
    });

    it('should return false for null scopes', () => {
      expect(scopesOverlap(null, ['electrical'])).toBe(false);
      expect(scopesOverlap(['electrical'], null)).toBe(false);
    });
  });

  describe('filterByScope', () => {
    it('should filter resources by scope access', () => {
      const userScope = ['electrical'];
      const resources = [
        { id: '1', scope: ['electrical'] },
        { id: '2', scope: ['plumbing'] },
        { id: '3', scope: ['electrical', 'lighting'] },
      ];
      const result = filterByScope(userScope, resources);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('should return empty array for empty user scope', () => {
      const resources = [{ id: '1', scope: ['electrical'] }];
      const result = filterByScope([], resources);
      expect(result).toEqual([]);
    });

    it('should exclude resources without scope', () => {
      const userScope = ['electrical'];
      const resources = [
        { id: '1', scope: ['electrical'] },
        { id: '2', scope: null },
        { id: '3', scope: undefined },
      ];
      const result = filterByScope(userScope, resources);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('isValidScope', () => {
    it('should validate array scope', () => {
      expect(isValidScope(['electrical', 'plumbing'])).toBe(true);
    });

    it('should validate object scope', () => {
      expect(isValidScope({ trades: ['electrical'], floors: ['1'] })).toBe(
        true,
      );
    });

    it('should accept null/undefined', () => {
      expect(isValidScope(null)).toBe(true);
      expect(isValidScope(undefined)).toBe(true);
    });

    it('should reject empty array', () => {
      expect(isValidScope([])).toBe(false);
    });

    it('should reject array with empty strings', () => {
      expect(isValidScope(['electrical', ''])).toBe(false);
    });

    it('should reject array with non-strings', () => {
      expect(isValidScope(['electrical', 123] as any)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isValidScope({})).toBe(false);
    });

    it('should reject object with empty array values', () => {
      expect(isValidScope({ trades: [] })).toBe(false);
    });

    it('should reject object with non-array values', () => {
      expect(isValidScope({ trades: 'electrical' } as any)).toBe(false);
    });

    it('should reject object with array containing non-strings', () => {
      expect(isValidScope({ trades: [1, 2] } as any)).toBe(false);
    });
  });

  describe('getScopeCategories', () => {
    it('should return categories from object scope', () => {
      const scope = { trades: ['electrical'], floors: ['1'] };
      const result = getScopeCategories(scope);
      expect(result.sort()).toEqual(['floors', 'trades']);
    });

    it('should return empty array for array scope', () => {
      const scope = ['electrical'];
      const result = getScopeCategories(scope as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for null', () => {
      const result = getScopeCategories(null);
      expect(result).toEqual([]);
    });
  });

  describe('getScopeCategoryTags', () => {
    it('should return tags for category', () => {
      const scope = { trades: ['electrical', 'plumbing'], floors: ['1'] };
      const result = getScopeCategoryTags(scope, 'trades');
      expect(result).toEqual(['electrical', 'plumbing']);
    });

    it('should return empty array for non-existent category', () => {
      const scope = { trades: ['electrical'] };
      const result = getScopeCategoryTags(scope, 'floors');
      expect(result).toEqual([]);
    });

    it('should return empty array for null scope', () => {
      const result = getScopeCategoryTags(null, 'trades');
      expect(result).toEqual([]);
    });

    it('should filter out empty strings', () => {
      const scope = { trades: ['electrical', '', 'plumbing'] };
      const result = getScopeCategoryTags(scope, 'trades');
      expect(result).toEqual(['electrical', 'plumbing']);
    });
  });

  describe('arrayToObjectScope', () => {
    it('should convert array to object scope', () => {
      const arrayScope = ['electrical', 'plumbing'];
      const result = arrayToObjectScope(arrayScope, 'trades');
      expect(result).toEqual({ trades: ['electrical', 'plumbing'] });
    });

    it('should use default category "tags"', () => {
      const arrayScope = ['electrical'];
      const result = arrayToObjectScope(arrayScope);
      expect(result).toEqual({ tags: ['electrical'] });
    });
  });

  describe('createScopeQuery', () => {
    it('should create query for non-empty scope', () => {
      const userScope = ['electrical', 'plumbing'];
      const result = createScopeQuery(userScope);
      expect(result.shouldFilter).toBe(true);
      expect(result.tags).toEqual(['electrical', 'plumbing']);
    });

    it('should indicate no filtering for empty scope', () => {
      const result = createScopeQuery([]);
      expect(result.shouldFilter).toBe(false);
      expect(result.tags).toEqual([]);
    });

    it('should handle null scope', () => {
      const result = createScopeQuery(null);
      expect(result.shouldFilter).toBe(false);
      expect(result.tags).toEqual([]);
    });

    it('should handle object scope', () => {
      const userScope = { trades: ['electrical'], floors: ['1'] };
      const result = createScopeQuery(userScope);
      expect(result.shouldFilter).toBe(true);
      expect(result.tags.sort()).toEqual(['1', 'electrical']);
    });
  });
});

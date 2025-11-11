/**
 * Permission Matcher Utility Tests
 */

import {
  hasPermission,
  matchesPermission,
  hasAnyPermission,
  hasAllPermissions,
  filterPermissions,
  createPermissionMap,
  expandWildcard,
  isValidPermission,
  parsePermission,
  buildPermission,
  getFeature,
  getResource,
  getAction,
  isWildcard,
  getWildcardSpecificity,
  sortBySpecificity,
  minimizePermissions,
} from '../permission-matcher.util';

describe('Permission Matcher Utility', () => {
  describe('hasPermission', () => {
    it('should match exact permission', () => {
      const userPerms = ['documents:drawing:read'];
      expect(hasPermission(userPerms, 'documents:drawing:read')).toBe(true);
    });

    it('should not match different permission', () => {
      const userPerms = ['documents:drawing:read'];
      expect(hasPermission(userPerms, 'documents:drawing:create')).toBe(false);
    });

    it('should match with wildcard resource', () => {
      const userPerms = ['documents:*:read'];
      expect(hasPermission(userPerms, 'documents:drawing:read')).toBe(true);
      expect(hasPermission(userPerms, 'documents:photo:read')).toBe(true);
    });

    it('should match with wildcard action', () => {
      const userPerms = ['documents:drawing:*'];
      expect(hasPermission(userPerms, 'documents:drawing:read')).toBe(true);
      expect(hasPermission(userPerms, 'documents:drawing:create')).toBe(true);
    });

    it('should match with full feature wildcard', () => {
      const userPerms = ['documents:*:*'];
      expect(hasPermission(userPerms, 'documents:drawing:read')).toBe(true);
      expect(hasPermission(userPerms, 'documents:photo:create')).toBe(true);
    });

    it('should match with global wildcard', () => {
      const userPerms = ['*:*:*'];
      expect(hasPermission(userPerms, 'documents:drawing:read')).toBe(true);
      expect(hasPermission(userPerms, 'rfis:rfi:create')).toBe(true);
    });

    it('should not match with non-matching wildcard', () => {
      const userPerms = ['documents:*:read'];
      expect(hasPermission(userPerms, 'documents:drawing:create')).toBe(false);
    });

    it('should handle multiple permissions', () => {
      const userPerms = [
        'documents:drawing:read',
        'documents:photo:create',
        'rfis:rfi:respond',
      ];
      expect(hasPermission(userPerms, 'documents:drawing:read')).toBe(true);
      expect(hasPermission(userPerms, 'rfis:rfi:respond')).toBe(true);
      expect(hasPermission(userPerms, 'rfis:rfi:create')).toBe(false);
    });

    it('should return false for empty permissions', () => {
      expect(hasPermission([], 'documents:drawing:read')).toBe(false);
    });
  });

  describe('matchesPermission', () => {
    it('should match exact permissions', () => {
      expect(
        matchesPermission('documents:drawing:read', 'documents:drawing:read'),
      ).toBe(true);
    });

    it('should match with wildcards', () => {
      expect(
        matchesPermission('documents:*:read', 'documents:drawing:read'),
      ).toBe(true);
      expect(
        matchesPermission('documents:drawing:*', 'documents:drawing:read'),
      ).toBe(true);
      expect(
        matchesPermission('documents:*:*', 'documents:drawing:read'),
      ).toBe(true);
      expect(
        matchesPermission('*:*:*', 'documents:drawing:read'),
      ).toBe(true);
    });

    it('should not match different features', () => {
      expect(
        matchesPermission('documents:*:*', 'rfis:rfi:create'),
      ).toBe(false);
    });

    it('should not match different resources', () => {
      expect(
        matchesPermission('documents:drawing:*', 'documents:photo:read'),
      ).toBe(false);
    });

    it('should not match different actions', () => {
      expect(
        matchesPermission('documents:*:read', 'documents:drawing:create'),
      ).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any required permission', () => {
      const userPerms = ['documents:drawing:read', 'rfis:rfi:create'];
      const required = ['documents:drawing:read', 'submittals:submittal:approve'];
      expect(hasAnyPermission(userPerms, required)).toBe(true);
    });

    it('should return false if user has none of the required permissions', () => {
      const userPerms = ['documents:drawing:read'];
      const required = ['rfis:rfi:create', 'submittals:submittal:approve'];
      expect(hasAnyPermission(userPerms, required)).toBe(false);
    });

    it('should return false for empty required permissions', () => {
      const userPerms = ['documents:drawing:read'];
      expect(hasAnyPermission(userPerms, [])).toBe(false);
    });

    it('should work with wildcards', () => {
      const userPerms = ['documents:*:read'];
      const required = ['documents:drawing:read', 'documents:photo:read'];
      expect(hasAnyPermission(userPerms, required)).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all required permissions', () => {
      const userPerms = [
        'documents:drawing:read',
        'documents:drawing:create',
        'rfis:rfi:read',
      ];
      const required = ['documents:drawing:read', 'rfis:rfi:read'];
      expect(hasAllPermissions(userPerms, required)).toBe(true);
    });

    it('should return false if user is missing any required permission', () => {
      const userPerms = ['documents:drawing:read'];
      const required = ['documents:drawing:read', 'rfis:rfi:read'];
      expect(hasAllPermissions(userPerms, required)).toBe(false);
    });

    it('should return true for empty required permissions', () => {
      const userPerms = ['documents:drawing:read'];
      expect(hasAllPermissions(userPerms, [])).toBe(true);
    });

    it('should work with wildcards', () => {
      const userPerms = ['documents:*:*'];
      const required = ['documents:drawing:read', 'documents:photo:create'];
      expect(hasAllPermissions(userPerms, required)).toBe(true);
    });
  });

  describe('filterPermissions', () => {
    it('should filter to only permissions user has', () => {
      const userPerms = ['documents:drawing:read', 'rfis:rfi:create'];
      const toCheck = [
        'documents:drawing:read',
        'documents:drawing:create',
        'rfis:rfi:create',
      ];
      const result = filterPermissions(userPerms, toCheck);
      expect(result).toEqual(['documents:drawing:read', 'rfis:rfi:create']);
    });

    it('should work with wildcards', () => {
      const userPerms = ['documents:*:read'];
      const toCheck = [
        'documents:drawing:read',
        'documents:photo:read',
        'documents:drawing:create',
      ];
      const result = filterPermissions(userPerms, toCheck);
      expect(result).toEqual([
        'documents:drawing:read',
        'documents:photo:read',
      ]);
    });
  });

  describe('createPermissionMap', () => {
    it('should create map of permission -> boolean', () => {
      const userPerms = ['documents:drawing:read', 'rfis:rfi:create'];
      const toCheck = [
        'documents:drawing:read',
        'documents:drawing:create',
        'rfis:rfi:create',
      ];
      const map = createPermissionMap(userPerms, toCheck);
      expect(map).toEqual({
        'documents:drawing:read': true,
        'documents:drawing:create': false,
        'rfis:rfi:create': true,
      });
    });

    it('should handle wildcards', () => {
      const userPerms = ['documents:*:read'];
      const toCheck = [
        'documents:drawing:read',
        'documents:photo:read',
        'documents:drawing:create',
      ];
      const map = createPermissionMap(userPerms, toCheck);
      expect(map).toEqual({
        'documents:drawing:read': true,
        'documents:photo:read': true,
        'documents:drawing:create': false,
      });
    });
  });

  describe('expandWildcard', () => {
    const allPerms = [
      'documents:drawing:read',
      'documents:drawing:create',
      'documents:photo:read',
      'documents:photo:create',
      'rfis:rfi:read',
      'rfis:rfi:create',
    ];

    it('should expand full wildcard', () => {
      const result = expandWildcard('*:*:*', allPerms);
      expect(result).toEqual(allPerms);
    });

    it('should expand feature wildcard', () => {
      const result = expandWildcard('documents:*:*', allPerms);
      expect(result).toEqual([
        'documents:drawing:read',
        'documents:drawing:create',
        'documents:photo:read',
        'documents:photo:create',
      ]);
    });

    it('should expand resource wildcard', () => {
      const result = expandWildcard('documents:drawing:*', allPerms);
      expect(result).toEqual([
        'documents:drawing:read',
        'documents:drawing:create',
      ]);
    });

    it('should expand action wildcard', () => {
      const result = expandWildcard('documents:*:read', allPerms);
      expect(result).toEqual([
        'documents:drawing:read',
        'documents:photo:read',
      ]);
    });
  });

  describe('isValidPermission', () => {
    it('should validate correct permission format', () => {
      expect(isValidPermission('documents:drawing:read')).toBe(true);
      expect(isValidPermission('rfis:rfi:create')).toBe(true);
      expect(isValidPermission('*:*:*')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidPermission('documents:drawing')).toBe(false);
      expect(isValidPermission('documents')).toBe(false);
      expect(isValidPermission('documents:drawing:read:extra')).toBe(false);
      expect(isValidPermission('')).toBe(false);
      expect(isValidPermission(':::')).toBe(false);
      expect(isValidPermission(null as any)).toBe(false);
      expect(isValidPermission(undefined as any)).toBe(false);
    });
  });

  describe('parsePermission', () => {
    it('should parse valid permission', () => {
      const result = parsePermission('documents:drawing:read');
      expect(result).toEqual({
        feature: 'documents',
        resource: 'drawing',
        action: 'read',
      });
    });

    it('should return null for invalid permission', () => {
      expect(parsePermission('documents:drawing')).toBeNull();
      expect(parsePermission('')).toBeNull();
    });
  });

  describe('buildPermission', () => {
    it('should build permission from components', () => {
      const result = buildPermission('documents', 'drawing', 'read');
      expect(result).toBe('documents:drawing:read');
    });

    it('should work with wildcards', () => {
      const result = buildPermission('documents', '*', 'read');
      expect(result).toBe('documents:*:read');
    });
  });

  describe('getFeature', () => {
    it('should extract feature from permission', () => {
      expect(getFeature('documents:drawing:read')).toBe('documents');
      expect(getFeature('rfis:rfi:create')).toBe('rfis');
    });

    it('should return null for invalid permission', () => {
      expect(getFeature('invalid')).toBeNull();
    });
  });

  describe('getResource', () => {
    it('should extract resource from permission', () => {
      expect(getResource('documents:drawing:read')).toBe('drawing');
      expect(getResource('rfis:rfi:create')).toBe('rfi');
    });

    it('should return null for invalid permission', () => {
      expect(getResource('invalid')).toBeNull();
    });
  });

  describe('getAction', () => {
    it('should extract action from permission', () => {
      expect(getAction('documents:drawing:read')).toBe('read');
      expect(getAction('rfis:rfi:create')).toBe('create');
    });

    it('should return null for invalid permission', () => {
      expect(getAction('invalid')).toBeNull();
    });
  });

  describe('isWildcard', () => {
    it('should detect wildcards', () => {
      expect(isWildcard('*:*:*')).toBe(true);
      expect(isWildcard('documents:*:*')).toBe(true);
      expect(isWildcard('documents:drawing:*')).toBe(true);
      expect(isWildcard('documents:*:read')).toBe(true);
    });

    it('should return false for non-wildcards', () => {
      expect(isWildcard('documents:drawing:read')).toBe(false);
      expect(isWildcard('rfis:rfi:create')).toBe(false);
    });
  });

  describe('getWildcardSpecificity', () => {
    it('should calculate specificity correctly', () => {
      expect(getWildcardSpecificity('*:*:*')).toBe(0);
      expect(getWildcardSpecificity('documents:*:*')).toBe(1);
      expect(getWildcardSpecificity('documents:drawing:*')).toBe(2);
      expect(getWildcardSpecificity('documents:drawing:read')).toBe(3);
      expect(getWildcardSpecificity('documents:*:read')).toBe(2);
    });

    it('should return -1 for invalid permission', () => {
      expect(getWildcardSpecificity('invalid')).toBe(-1);
    });
  });

  describe('sortBySpecificity', () => {
    it('should sort by most specific first', () => {
      const perms = [
        '*:*:*',
        'documents:*:*',
        'documents:drawing:*',
        'documents:drawing:read',
      ];
      const sorted = sortBySpecificity(perms);
      expect(sorted).toEqual([
        'documents:drawing:read',
        'documents:drawing:*',
        'documents:*:*',
        '*:*:*',
      ]);
    });
  });

  describe('minimizePermissions', () => {
    it('should keep only wildcard when it covers others', () => {
      const perms = ['*:*:*', 'documents:drawing:read'];
      const minimized = minimizePermissions(perms);
      expect(minimized).toEqual(['*:*:*']);
    });

    it('should remove permissions covered by wildcards', () => {
      const perms = [
        'documents:*:*',
        'documents:drawing:read',
        'documents:photo:create',
      ];
      const minimized = minimizePermissions(perms);
      expect(minimized).toEqual(['documents:*:*']);
    });

    it('should keep permissions not covered by wildcards', () => {
      const perms = [
        'documents:*:read',
        'documents:drawing:create',
        'rfis:rfi:read',
      ];
      const minimized = minimizePermissions(perms);
      expect(minimized).toContain('documents:*:read');
      expect(minimized).toContain('documents:drawing:create');
      expect(minimized).toContain('rfis:rfi:read');
    });

    it('should handle no redundancy', () => {
      const perms = [
        'documents:drawing:read',
        'rfis:rfi:create',
        'submittals:submittal:approve',
      ];
      const minimized = minimizePermissions(perms);
      expect(minimized).toEqual(perms);
    });
  });
});

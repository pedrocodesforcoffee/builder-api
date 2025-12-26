import {
  validateScope,
  validateExpiresAt,
  validateProjectRoleHierarchy,
  validateInvitationTimestamps,
  validateScopeForRole,
  validateExpiresAtForRole,
} from '../project-member.validator';
import { ProjectRole } from '../../../users/enums/project-role.enum';
import { BadRequestException } from '@nestjs/common';

describe('Project Member Validators', () => {
  describe('validateScope', () => {
    it('should accept null scope', () => {
      expect(() => validateScope(null)).not.toThrow();
    });

    it('should accept undefined scope', () => {
      expect(() => validateScope(undefined)).not.toThrow();
    });

    it('should accept valid array scope', () => {
      expect(() => validateScope(['electrical', 'plumbing'])).not.toThrow();
    });

    it('should accept valid object scope', () => {
      expect(() => validateScope({ trades: ['electrical'], floors: ['1'] })).not.toThrow();
    });

    it('should reject empty array scope', () => {
      expect(() => validateScope([])).toThrow(BadRequestException);
      expect(() => validateScope([])).toThrow('Scope array cannot be empty');
    });

    it('should reject array with non-string elements', () => {
      expect(() => validateScope([1, 2] as any)).toThrow(BadRequestException);
      expect(() => validateScope([1, 2] as any)).toThrow('must contain only string values');
    });

    it('should reject array with empty strings', () => {
      expect(() => validateScope(['electrical', ''])).toThrow(BadRequestException);
      expect(() => validateScope(['electrical', ''])).toThrow('cannot contain empty strings');
    });

    it('should reject empty object scope', () => {
      expect(() => validateScope({})).toThrow(BadRequestException);
      expect(() => validateScope({})).toThrow('Scope object cannot be empty');
    });

    it('should reject object with empty array values', () => {
      expect(() => validateScope({ trades: [] })).toThrow(BadRequestException);
      expect(() => validateScope({ trades: [] })).toThrow('cannot be empty');
    });

    it('should reject object with non-array values', () => {
      expect(() => validateScope({ trades: 'electrical' } as any)).toThrow(BadRequestException);
      expect(() => validateScope({ trades: 'electrical' } as any)).toThrow('must be arrays');
    });

    it('should reject object with array containing non-strings', () => {
      expect(() => validateScope({ trades: [1, 2] } as any)).toThrow(BadRequestException);
      expect(() => validateScope({ trades: [1, 2] } as any)).toThrow('must contain only string values');
    });

    it('should reject object with array containing empty strings', () => {
      expect(() => validateScope({ trades: ['electrical', ''] })).toThrow(BadRequestException);
      expect(() => validateScope({ trades: ['electrical', ''] })).toThrow('cannot contain empty strings');
    });

    it('should accept complex valid object scope', () => {
      const scope = {
        trades: ['electrical', 'plumbing', 'hvac'],
        floors: ['1', '2', '3'],
        areas: ['north', 'south'],
      };
      expect(() => validateScope(scope)).not.toThrow();
    });

    it('should reject invalid format (number)', () => {
      expect(() => validateScope(123 as any)).toThrow(BadRequestException);
      expect(() => validateScope(123 as any)).toThrow('Invalid scope format');
    });

    it('should reject invalid format (string)', () => {
      expect(() => validateScope('electrical' as any)).toThrow(BadRequestException);
      expect(() => validateScope('electrical' as any)).toThrow('Invalid scope format');
    });
  });

  describe('validateExpiresAt', () => {
    it('should accept null expiresAt', () => {
      expect(() => validateExpiresAt(null)).not.toThrow();
    });

    it('should accept undefined expiresAt', () => {
      expect(() => validateExpiresAt(undefined)).not.toThrow();
    });

    it('should accept future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      expect(() => validateExpiresAt(futureDate)).not.toThrow();
    });

    it('should reject past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(() => validateExpiresAt(pastDate)).toThrow(BadRequestException);
      expect(() => validateExpiresAt(pastDate)).toThrow('must be a future date');
    });

    it('should reject current time (edge case)', () => {
      const now = new Date();
      expect(() => validateExpiresAt(now)).toThrow(BadRequestException);
    });

    it('should reject date more than default 5 years in future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 6);
      expect(() => validateExpiresAt(farFuture)).toThrow(BadRequestException);
      expect(() => validateExpiresAt(farFuture)).toThrow('cannot be more than 5 years');
    });

    it('should accept date within custom max years', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 8);
      expect(() => validateExpiresAt(future, 10)).not.toThrow();
    });

    it('should reject date beyond custom max years', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 4);
      expect(() => validateExpiresAt(farFuture, 3)).toThrow(BadRequestException);
      expect(() => validateExpiresAt(farFuture, 3)).toThrow('cannot be more than 3 years');
    });

    it('should reject invalid date', () => {
      const invalidDate = new Date('invalid');
      expect(() => validateExpiresAt(invalidDate)).toThrow(BadRequestException);
      expect(() => validateExpiresAt(invalidDate)).toThrow('must be a valid date');
    });
  });

  describe('validateProjectRoleHierarchy', () => {
    it('should allow PROJECT_ADMIN to assign any role', () => {
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_MANAGER)
      ).not.toThrow();
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_ADMIN, ProjectRole.VIEWER)
      ).not.toThrow();
    });

    it('should only allow PROJECT_ADMIN to assign PROJECT_ADMIN role', () => {
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_ADMIN, ProjectRole.PROJECT_ADMIN)
      ).not.toThrow();

      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_MANAGER, ProjectRole.PROJECT_ADMIN)
      ).toThrow(BadRequestException);
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_MANAGER, ProjectRole.PROJECT_ADMIN)
      ).toThrow('Only project admins can assign');
    });

    it('should allow PROJECT_MANAGER to assign non-admin roles', () => {
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_MANAGER, ProjectRole.PROJECT_ENGINEER)
      ).not.toThrow();
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_MANAGER, ProjectRole.FOREMAN)
      ).not.toThrow();
    });

    it('should prevent lower roles from assigning higher admin roles', () => {
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_ENGINEER, ProjectRole.PROJECT_MANAGER)
      ).toThrow(BadRequestException);
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_ENGINEER, ProjectRole.PROJECT_MANAGER)
      ).toThrow('Insufficient permissions');
    });

    it('should prevent non-admin roles from managing members', () => {
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.FOREMAN, ProjectRole.VIEWER)
      ).toThrow(BadRequestException);
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.FOREMAN, ProjectRole.VIEWER)
      ).toThrow('does not have permission to manage');
    });

    it('should allow assigning same level role', () => {
      expect(() =>
        validateProjectRoleHierarchy(ProjectRole.PROJECT_MANAGER, ProjectRole.PROJECT_MANAGER)
      ).not.toThrow();
    });
  });

  describe('validateInvitationTimestamps', () => {
    it('should accept all null timestamps', () => {
      expect(() => validateInvitationTimestamps(null, null, null)).not.toThrow();
    });

    it('should accept only invitedAt', () => {
      expect(() => validateInvitationTimestamps(new Date(), null, null)).not.toThrow();
    });

    it('should accept invitedAt and acceptedAt', () => {
      const now = new Date();
      const later = new Date(now.getTime() + 1000);
      expect(() => validateInvitationTimestamps(now, later, null)).not.toThrow();
    });

    it('should accept complete workflow', () => {
      const invited = new Date();
      const accepted = new Date(invited.getTime() + 1000);
      const joined = new Date(accepted.getTime() + 1000);
      expect(() => validateInvitationTimestamps(invited, accepted, joined)).not.toThrow();
    });

    it('should reject acceptedAt without invitedAt', () => {
      expect(() => validateInvitationTimestamps(null, new Date(), null)).toThrow(BadRequestException);
      expect(() => validateInvitationTimestamps(null, new Date(), null)).toThrow(
        'Cannot set acceptedAt without invitedAt'
      );
    });

    it('should reject joinedAt without acceptedAt', () => {
      expect(() => validateInvitationTimestamps(new Date(), null, new Date())).toThrow(BadRequestException);
      expect(() => validateInvitationTimestamps(new Date(), null, new Date())).toThrow(
        'Cannot set joinedAt without acceptedAt'
      );
    });

    it('should reject acceptedAt before invitedAt', () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000);
      expect(() => validateInvitationTimestamps(now, earlier, null)).toThrow(BadRequestException);
      expect(() => validateInvitationTimestamps(now, earlier, null)).toThrow(
        'acceptedAt cannot be before invitedAt'
      );
    });

    it('should reject joinedAt before acceptedAt', () => {
      const invited = new Date();
      const accepted = new Date(invited.getTime() + 1000);
      const joined = new Date(invited.getTime() + 500);
      expect(() => validateInvitationTimestamps(invited, accepted, joined)).toThrow(BadRequestException);
      expect(() => validateInvitationTimestamps(invited, accepted, joined)).toThrow(
        'joinedAt cannot be before acceptedAt'
      );
    });

    it('should accept acceptedAt same as invitedAt', () => {
      const now = new Date();
      expect(() => validateInvitationTimestamps(now, now, null)).not.toThrow();
    });

    it('should accept joinedAt same as acceptedAt', () => {
      const invited = new Date();
      const accepted = new Date(invited.getTime() + 1000);
      expect(() => validateInvitationTimestamps(invited, accepted, accepted)).not.toThrow();
    });
  });

  describe('validateScopeForRole', () => {
    it('should warn when PROJECT_ADMIN has scope', () => {
      const warning = validateScopeForRole(ProjectRole.PROJECT_ADMIN, ['electrical']);
      expect(warning).toContain('PROJECT_ADMIN');
      expect(warning).toContain('should not have scope limitations');
    });

    it('should warn when PROJECT_MANAGER has scope', () => {
      const warning = validateScopeForRole(ProjectRole.PROJECT_MANAGER, ['electrical']);
      expect(warning).toContain('PROJECT_MANAGER');
      expect(warning).toContain('unusual');
    });

    it('should warn when SUBCONTRACTOR has no scope', () => {
      const warning = validateScopeForRole(ProjectRole.SUBCONTRACTOR, null);
      expect(warning).toContain('subcontractor');
      expect(warning).toContain('typically have scope limitations');
    });

    it('should warn when FOREMAN has no scope', () => {
      const warning = validateScopeForRole(ProjectRole.FOREMAN, null);
      expect(warning).toContain('foreman');
      expect(warning).toContain('typically have scope limitations');
    });

    it('should not warn for SUBCONTRACTOR with scope', () => {
      const warning = validateScopeForRole(ProjectRole.SUBCONTRACTOR, ['electrical']);
      expect(warning).toBeNull();
    });

    it('should not warn for PROJECT_ADMIN without scope', () => {
      const warning = validateScopeForRole(ProjectRole.PROJECT_ADMIN, null);
      expect(warning).toBeNull();
    });

    it('should not warn for other roles', () => {
      expect(validateScopeForRole(ProjectRole.VIEWER, null)).toBeNull();
      expect(validateScopeForRole(ProjectRole.INSPECTOR, ['area1'])).toBeNull();
    });
  });

  describe('validateExpiresAtForRole', () => {
    it('should warn when PROJECT_ADMIN has expiration', () => {
      const warning = validateExpiresAtForRole(ProjectRole.PROJECT_ADMIN, new Date());
      expect(warning).toContain('project_admin');
      expect(warning).toContain('do not have expiration');
    });

    it('should warn when PROJECT_MANAGER has expiration', () => {
      const warning = validateExpiresAtForRole(ProjectRole.PROJECT_MANAGER, new Date());
      expect(warning).toContain('project_manager');
      expect(warning).toContain('do not have expiration');
    });

    it('should warn when SUBCONTRACTOR has no expiration', () => {
      const warning = validateExpiresAtForRole(ProjectRole.SUBCONTRACTOR, null);
      expect(warning).toContain('subcontractor');
      expect(warning).toContain('typically have expiration');
    });

    it('should warn when INSPECTOR has no expiration', () => {
      const warning = validateExpiresAtForRole(ProjectRole.INSPECTOR, null);
      expect(warning).toContain('inspector');
      expect(warning).toContain('typically have expiration');
    });

    it('should not warn for SUBCONTRACTOR with expiration', () => {
      const warning = validateExpiresAtForRole(ProjectRole.SUBCONTRACTOR, new Date());
      expect(warning).toBeNull();
    });

    it('should not warn for PROJECT_ADMIN without expiration', () => {
      const warning = validateExpiresAtForRole(ProjectRole.PROJECT_ADMIN, null);
      expect(warning).toBeNull();
    });

    it('should not warn for other roles', () => {
      expect(validateExpiresAtForRole(ProjectRole.FOREMAN, null)).toBeNull();
      expect(validateExpiresAtForRole(ProjectRole.VIEWER, new Date())).toBeNull();
    });
  });
});

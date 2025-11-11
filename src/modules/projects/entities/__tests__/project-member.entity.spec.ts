import { ProjectMember } from '../project-member.entity';
import { ProjectRole } from '../../../users/enums/project-role.enum';

describe('ProjectMember Entity', () => {
  describe('Helper Methods - isExpired', () => {
    it('should return false when expiresAt is null', () => {
      const member = new ProjectMember();
      member.expiresAt = null;

      expect(member.isExpired()).toBe(false);
    });

    it('should return false when expiresAt is undefined', () => {
      const member = new ProjectMember();

      expect(member.isExpired()).toBe(false);
    });

    it('should return true when expiresAt is in the past', () => {
      const member = new ProjectMember();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      member.expiresAt = pastDate;

      expect(member.isExpired()).toBe(true);
    });

    it('should return false when expiresAt is in the future', () => {
      const member = new ProjectMember();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      member.expiresAt = futureDate;

      expect(member.isExpired()).toBe(false);
    });

    it('should return true when expiresAt is exactly now (edge case)', () => {
      const member = new ProjectMember();
      const now = new Date();
      now.setMilliseconds(now.getMilliseconds() - 1); // Just passed
      member.expiresAt = now;

      expect(member.isExpired()).toBe(true);
    });
  });

  describe('Helper Methods - isProjectAdmin', () => {
    it('should return true for PROJECT_ADMIN role', () => {
      const member = new ProjectMember();
      member.role = ProjectRole.PROJECT_ADMIN;

      expect(member.isProjectAdmin()).toBe(true);
    });

    it('should return false for PROJECT_MANAGER role', () => {
      const member = new ProjectMember();
      member.role = ProjectRole.PROJECT_MANAGER;

      expect(member.isProjectAdmin()).toBe(false);
    });

    it('should return false for other roles', () => {
      const roles = [
        ProjectRole.PROJECT_ENGINEER,
        ProjectRole.SUPERINTENDENT,
        ProjectRole.FOREMAN,
        ProjectRole.SUBCONTRACTOR,
        ProjectRole.VIEWER,
      ];

      roles.forEach(role => {
        const member = new ProjectMember();
        member.role = role;
        expect(member.isProjectAdmin()).toBe(false);
      });
    });
  });

  describe('Helper Methods - canManageMembers', () => {
    it('should return true for PROJECT_ADMIN', () => {
      const member = new ProjectMember();
      member.role = ProjectRole.PROJECT_ADMIN;

      expect(member.canManageMembers()).toBe(true);
    });

    it('should return true for PROJECT_MANAGER', () => {
      const member = new ProjectMember();
      member.role = ProjectRole.PROJECT_MANAGER;

      expect(member.canManageMembers()).toBe(true);
    });

    it('should return false for other roles', () => {
      const roles = [
        ProjectRole.PROJECT_ENGINEER,
        ProjectRole.SUPERINTENDENT,
        ProjectRole.FOREMAN,
        ProjectRole.VIEWER,
      ];

      roles.forEach(role => {
        const member = new ProjectMember();
        member.role = role;
        expect(member.canManageMembers()).toBe(false);
      });
    });
  });

  describe('Helper Methods - canEditData', () => {
    it('should return true for PROJECT_ADMIN', () => {
      const member = new ProjectMember();
      member.role = ProjectRole.PROJECT_ADMIN;

      expect(member.canEditData()).toBe(true);
    });

    it('should return true for editable roles', () => {
      const editableRoles = [
        ProjectRole.PROJECT_MANAGER,
        ProjectRole.PROJECT_ENGINEER,
        ProjectRole.SUPERINTENDENT,
        ProjectRole.FOREMAN,
        ProjectRole.ARCHITECT_ENGINEER,
        ProjectRole.SUBCONTRACTOR,
      ];

      editableRoles.forEach(role => {
        const member = new ProjectMember();
        member.role = role;
        expect(member.canEditData()).toBe(true);
      });
    });

    it('should return false for read-only roles', () => {
      const readOnlyRoles = [
        ProjectRole.VIEWER,
        ProjectRole.INSPECTOR,
        ProjectRole.OWNER_REP,
      ];

      readOnlyRoles.forEach(role => {
        const member = new ProjectMember();
        member.role = role;
        expect(member.canEditData()).toBe(false);
      });
    });
  });

  describe('Helper Methods - hasAdminRoleLevel', () => {
    it('should return true when member has required admin level', () => {
      const member = new ProjectMember();
      member.role = ProjectRole.PROJECT_ADMIN;

      expect(member.hasAdminRoleLevel(ProjectRole.PROJECT_MANAGER)).toBe(true);
      expect(member.hasAdminRoleLevel(ProjectRole.PROJECT_ENGINEER)).toBe(true);
    });

    it('should return false when member lacks required admin level', () => {
      const member = new ProjectMember();
      member.role = ProjectRole.PROJECT_ENGINEER;

      expect(member.hasAdminRoleLevel(ProjectRole.PROJECT_ADMIN)).toBe(false);
      expect(member.hasAdminRoleLevel(ProjectRole.PROJECT_MANAGER)).toBe(false);
    });

    it('should return true for same level', () => {
      const member = new ProjectMember();
      member.role = ProjectRole.PROJECT_MANAGER;

      expect(member.hasAdminRoleLevel(ProjectRole.PROJECT_MANAGER)).toBe(true);
    });
  });

  describe('Helper Methods - hasScopeLimitations', () => {
    it('should return false when scope is null', () => {
      const member = new ProjectMember();
      member.scope = null;

      expect(member.hasScopeLimitations()).toBe(false);
    });

    it('should return false when scope is undefined', () => {
      const member = new ProjectMember();

      expect(member.hasScopeLimitations()).toBe(false);
    });

    it('should return true when scope is an array', () => {
      const member = new ProjectMember();
      member.scope = ['electrical', 'plumbing'];

      expect(member.hasScopeLimitations()).toBe(true);
    });

    it('should return true when scope is an object', () => {
      const member = new ProjectMember();
      member.scope = { trades: ['electrical'] };

      expect(member.hasScopeLimitations()).toBe(true);
    });
  });

  describe('Helper Methods - hasAccessToScope (Array format)', () => {
    it('should return true when no scope limitations exist', () => {
      const member = new ProjectMember();
      member.scope = null;

      expect(member.hasAccessToScope('trades', 'electrical')).toBe(true);
    });

    it('should return true when scope includes the value', () => {
      const member = new ProjectMember();
      member.scope = ['electrical', 'plumbing'];

      expect(member.hasAccessToScope(undefined, 'electrical')).toBe(true);
      expect(member.hasAccessToScope(undefined, 'plumbing')).toBe(true);
    });

    it('should return false when scope does not include the value', () => {
      const member = new ProjectMember();
      member.scope = ['electrical', 'plumbing'];

      expect(member.hasAccessToScope(undefined, 'hvac')).toBe(false);
    });

    it('should return true when no value specified and array has items', () => {
      const member = new ProjectMember();
      member.scope = ['electrical'];

      expect(member.hasAccessToScope()).toBe(true);
    });
  });

  describe('Helper Methods - hasAccessToScope (Object format)', () => {
    it('should return true when scope includes the key and value', () => {
      const member = new ProjectMember();
      member.scope = {
        trades: ['electrical', 'plumbing'],
        floors: ['1', '2'],
      };

      expect(member.hasAccessToScope('trades', 'electrical')).toBe(true);
      expect(member.hasAccessToScope('floors', '1')).toBe(true);
    });

    it('should return false when key does not exist', () => {
      const member = new ProjectMember();
      member.scope = { trades: ['electrical'] };

      expect(member.hasAccessToScope('floors', '1')).toBe(false);
    });

    it('should return false when value not in array for key', () => {
      const member = new ProjectMember();
      member.scope = { trades: ['electrical'] };

      expect(member.hasAccessToScope('trades', 'plumbing')).toBe(false);
    });

    it('should return true when only key specified and key exists', () => {
      const member = new ProjectMember();
      member.scope = { trades: ['electrical'] };

      expect(member.hasAccessToScope('trades')).toBe(true);
    });

    it('should return false when key value is not an array', () => {
      const member = new ProjectMember();
      member.scope = { trades: 'electrical' } as any;

      expect(member.hasAccessToScope('trades', 'electrical')).toBe(false);
    });
  });

  describe('Helper Methods - isInvitationPending', () => {
    it('should return true when invited but not accepted', () => {
      const member = new ProjectMember();
      member.invitedAt = new Date();
      member.acceptedAt = null;

      expect(member.isInvitationPending()).toBe(true);
    });

    it('should return false when not invited', () => {
      const member = new ProjectMember();

      expect(member.isInvitationPending()).toBe(false);
    });

    it('should return false when invited and accepted', () => {
      const member = new ProjectMember();
      member.invitedAt = new Date();
      member.acceptedAt = new Date();

      expect(member.isInvitationPending()).toBe(false);
    });
  });

  describe('Helper Methods - hasJoined', () => {
    it('should return true when joinedAt is set', () => {
      const member = new ProjectMember();
      member.joinedAt = new Date();

      expect(member.hasJoined()).toBe(true);
    });

    it('should return false when joinedAt is null', () => {
      const member = new ProjectMember();
      member.joinedAt = null;

      expect(member.hasJoined()).toBe(false);
    });

    it('should return false when joinedAt is undefined', () => {
      const member = new ProjectMember();

      expect(member.hasJoined()).toBe(false);
    });
  });

  describe('Helper Methods - getDaysSinceLastAccess', () => {
    it('should return null when lastAccessedAt is null', () => {
      const member = new ProjectMember();
      member.lastAccessedAt = null;

      expect(member.getDaysSinceLastAccess()).toBeNull();
    });

    it('should return null when lastAccessedAt is undefined', () => {
      const member = new ProjectMember();

      expect(member.getDaysSinceLastAccess()).toBeNull();
    });

    it('should return 0 for access today', () => {
      const member = new ProjectMember();
      member.lastAccessedAt = new Date();

      expect(member.getDaysSinceLastAccess()).toBe(0);
    });

    it('should return correct number of days for past access', () => {
      const member = new ProjectMember();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      member.lastAccessedAt = pastDate;

      expect(member.getDaysSinceLastAccess()).toBe(5);
    });

    it('should return correct number of days for 30 days ago', () => {
      const member = new ProjectMember();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      member.lastAccessedAt = pastDate;

      expect(member.getDaysSinceLastAccess()).toBe(30);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all project roles', () => {
      const roles = [
        ProjectRole.PROJECT_ADMIN,
        ProjectRole.PROJECT_MANAGER,
        ProjectRole.PROJECT_ENGINEER,
        ProjectRole.SUPERINTENDENT,
        ProjectRole.FOREMAN,
        ProjectRole.ARCHITECT_ENGINEER,
        ProjectRole.SUBCONTRACTOR,
        ProjectRole.OWNER_REP,
        ProjectRole.INSPECTOR,
        ProjectRole.VIEWER,
      ];

      roles.forEach(role => {
        const member = new ProjectMember();
        member.role = role;
        expect(member.role).toBe(role);
      });
    });

    it('should handle empty scope array', () => {
      const member = new ProjectMember();
      member.scope = [];

      expect(member.hasScopeLimitations()).toBe(true);
      expect(member.hasAccessToScope()).toBe(false);
    });

    it('should handle empty scope object', () => {
      const member = new ProjectMember();
      member.scope = {};

      expect(member.hasScopeLimitations()).toBe(true);
      expect(member.hasAccessToScope()).toBe(false);
    });

    it('should handle complex nested scope structures', () => {
      const member = new ProjectMember();
      member.scope = {
        trades: ['electrical', 'plumbing', 'hvac'],
        floors: ['1', '2', '3', 'basement'],
        areas: ['north-wing', 'south-wing'],
      };

      expect(member.hasAccessToScope('trades', 'electrical')).toBe(true);
      expect(member.hasAccessToScope('floors', '2')).toBe(true);
      expect(member.hasAccessToScope('areas', 'east-wing')).toBe(false);
    });
  });
});

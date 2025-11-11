import { OrganizationMember } from '../organization-member.entity';
import { OrganizationRole } from '../../../users/enums/organization-role.enum';

describe('OrganizationMember Entity', () => {
  describe('Helper Methods - isOwner', () => {
    it('should return true for OWNER role', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.OWNER;

      expect(member.isOwner()).toBe(true);
    });

    it('should return false for ORG_ADMIN role', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_ADMIN;

      expect(member.isOwner()).toBe(false);
    });

    it('should return false for ORG_MEMBER role', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_MEMBER;

      expect(member.isOwner()).toBe(false);
    });

    it('should return false for GUEST role', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.GUEST;

      expect(member.isOwner()).toBe(false);
    });
  });

  describe('Helper Methods - isAdmin', () => {
    it('should return true for OWNER role', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.OWNER;

      expect(member.isAdmin()).toBe(true);
    });

    it('should return true for ORG_ADMIN role', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_ADMIN;

      expect(member.isAdmin()).toBe(true);
    });

    it('should return false for ORG_MEMBER role', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_MEMBER;

      expect(member.isAdmin()).toBe(false);
    });

    it('should return false for GUEST role', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.GUEST;

      expect(member.isAdmin()).toBe(false);
    });
  });

  describe('Helper Methods - canManageMembers', () => {
    it('should return true for OWNER', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.OWNER;

      expect(member.canManageMembers()).toBe(true);
    });

    it('should return true for ORG_ADMIN', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_ADMIN;

      expect(member.canManageMembers()).toBe(true);
    });

    it('should return false for ORG_MEMBER', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_MEMBER;

      expect(member.canManageMembers()).toBe(false);
    });

    it('should return false for GUEST', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.GUEST;

      expect(member.canManageMembers()).toBe(false);
    });
  });

  describe('Helper Methods - hasRoleLevel', () => {
    it('should return true when member has higher role level', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.OWNER;

      expect(member.hasRoleLevel(OrganizationRole.ORG_ADMIN)).toBe(true);
      expect(member.hasRoleLevel(OrganizationRole.ORG_MEMBER)).toBe(true);
      expect(member.hasRoleLevel(OrganizationRole.GUEST)).toBe(true);
    });

    it('should return true for same role level', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_ADMIN;

      expect(member.hasRoleLevel(OrganizationRole.ORG_ADMIN)).toBe(true);
    });

    it('should return false when member has lower role level', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_MEMBER;

      expect(member.hasRoleLevel(OrganizationRole.ORG_ADMIN)).toBe(false);
      expect(member.hasRoleLevel(OrganizationRole.OWNER)).toBe(false);
    });

    it('should validate complete role hierarchy', () => {
      const ownerMember = new OrganizationMember();
      ownerMember.role = OrganizationRole.OWNER;
      expect(ownerMember.hasRoleLevel(OrganizationRole.OWNER)).toBe(true);
      expect(ownerMember.hasRoleLevel(OrganizationRole.ORG_ADMIN)).toBe(true);
      expect(ownerMember.hasRoleLevel(OrganizationRole.ORG_MEMBER)).toBe(true);
      expect(ownerMember.hasRoleLevel(OrganizationRole.GUEST)).toBe(true);

      const adminMember = new OrganizationMember();
      adminMember.role = OrganizationRole.ORG_ADMIN;
      expect(adminMember.hasRoleLevel(OrganizationRole.OWNER)).toBe(false);
      expect(adminMember.hasRoleLevel(OrganizationRole.ORG_ADMIN)).toBe(true);
      expect(adminMember.hasRoleLevel(OrganizationRole.ORG_MEMBER)).toBe(true);
      expect(adminMember.hasRoleLevel(OrganizationRole.GUEST)).toBe(true);

      const orgMember = new OrganizationMember();
      orgMember.role = OrganizationRole.ORG_MEMBER;
      expect(orgMember.hasRoleLevel(OrganizationRole.OWNER)).toBe(false);
      expect(orgMember.hasRoleLevel(OrganizationRole.ORG_ADMIN)).toBe(false);
      expect(orgMember.hasRoleLevel(OrganizationRole.ORG_MEMBER)).toBe(true);
      expect(orgMember.hasRoleLevel(OrganizationRole.GUEST)).toBe(true);

      const guestMember = new OrganizationMember();
      guestMember.role = OrganizationRole.GUEST;
      expect(guestMember.hasRoleLevel(OrganizationRole.OWNER)).toBe(false);
      expect(guestMember.hasRoleLevel(OrganizationRole.ORG_ADMIN)).toBe(false);
      expect(guestMember.hasRoleLevel(OrganizationRole.ORG_MEMBER)).toBe(false);
      expect(guestMember.hasRoleLevel(OrganizationRole.GUEST)).toBe(true);
    });
  });

  describe('Helper Methods - isInvitationPending', () => {
    it('should return true when invited but not accepted', () => {
      const member = new OrganizationMember();
      member.invitedAt = new Date();
      member.acceptedAt = null;

      expect(member.isInvitationPending()).toBe(true);
    });

    it('should return false when not invited', () => {
      const member = new OrganizationMember();

      expect(member.isInvitationPending()).toBe(false);
    });

    it('should return false when invited and accepted', () => {
      const member = new OrganizationMember();
      member.invitedAt = new Date();
      member.acceptedAt = new Date();

      expect(member.isInvitationPending()).toBe(false);
    });

    it('should return false when invitedAt is null', () => {
      const member = new OrganizationMember();
      member.invitedAt = null;
      member.acceptedAt = null;

      expect(member.isInvitationPending()).toBe(false);
    });
  });

  describe('Helper Methods - hasJoined', () => {
    it('should return true when joinedAt is set', () => {
      const member = new OrganizationMember();
      member.joinedAt = new Date();

      expect(member.hasJoined()).toBe(true);
    });

    it('should return false when joinedAt is null', () => {
      const member = new OrganizationMember();
      member.joinedAt = null;

      expect(member.hasJoined()).toBe(false);
    });

    it('should return false when joinedAt is undefined', () => {
      const member = new OrganizationMember();

      expect(member.hasJoined()).toBe(false);
    });
  });

  describe('Invitation Workflow', () => {
    it('should handle complete invitation workflow', () => {
      const member = new OrganizationMember();

      // Initially no invitation
      expect(member.isInvitationPending()).toBe(false);
      expect(member.hasJoined()).toBe(false);

      // Invitation sent
      member.invitedAt = new Date();
      expect(member.isInvitationPending()).toBe(true);
      expect(member.hasJoined()).toBe(false);

      // Invitation accepted
      member.acceptedAt = new Date();
      expect(member.isInvitationPending()).toBe(false);
      expect(member.hasJoined()).toBe(false);

      // Member joined
      member.joinedAt = new Date();
      expect(member.isInvitationPending()).toBe(false);
      expect(member.hasJoined()).toBe(true);
    });

    it('should handle direct assignment without invitation', () => {
      const member = new OrganizationMember();

      // Direct assignment - immediately joined
      member.joinedAt = new Date();

      expect(member.isInvitationPending()).toBe(false);
      expect(member.hasJoined()).toBe(true);
    });
  });

  describe('Role Relationships', () => {
    it('should ensure all admins can manage members', () => {
      const owner = new OrganizationMember();
      owner.role = OrganizationRole.OWNER;
      expect(owner.isAdmin()).toBe(true);
      expect(owner.canManageMembers()).toBe(true);

      const admin = new OrganizationMember();
      admin.role = OrganizationRole.ORG_ADMIN;
      expect(admin.isAdmin()).toBe(true);
      expect(admin.canManageMembers()).toBe(true);
    });

    it('should ensure non-admins cannot manage members', () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_MEMBER;
      expect(member.isAdmin()).toBe(false);
      expect(member.canManageMembers()).toBe(false);

      const guest = new OrganizationMember();
      guest.role = OrganizationRole.GUEST;
      expect(guest.isAdmin()).toBe(false);
      expect(guest.canManageMembers()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all organization roles', () => {
      const roles = [
        OrganizationRole.OWNER,
        OrganizationRole.ORG_ADMIN,
        OrganizationRole.ORG_MEMBER,
        OrganizationRole.GUEST,
      ];

      roles.forEach(role => {
        const member = new OrganizationMember();
        member.role = role;
        expect(member.role).toBe(role);
      });
    });

    it('should handle timestamps with same values', () => {
      const member = new OrganizationMember();
      const now = new Date();

      member.invitedAt = now;
      member.acceptedAt = now;
      member.joinedAt = now;

      expect(member.isInvitationPending()).toBe(false);
      expect(member.hasJoined()).toBe(true);
    });

    it('should handle composite primary key fields', () => {
      const member = new OrganizationMember();
      member.userId = '123e4567-e89b-12d3-a456-426614174000';
      member.organizationId = '987e6543-e21b-43d3-b654-321987654321';

      expect(member.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(member.organizationId).toBe('987e6543-e21b-43d3-b654-321987654321');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data types for all fields', () => {
      const member = new OrganizationMember();
      member.userId = '123e4567-e89b-12d3-a456-426614174000';
      member.organizationId = '987e6543-e21b-43d3-b654-321987654321';
      member.role = OrganizationRole.ORG_ADMIN;
      member.addedByUserId = '111e2222-e33b-44d3-b555-666777888999';
      member.invitedAt = new Date();
      member.acceptedAt = new Date();
      member.joinedAt = new Date();
      member.createdAt = new Date();
      member.updatedAt = new Date();

      expect(typeof member.userId).toBe('string');
      expect(typeof member.organizationId).toBe('string');
      expect(typeof member.role).toBe('string');
      expect(typeof member.addedByUserId).toBe('string');
      expect(member.invitedAt).toBeInstanceOf(Date);
      expect(member.acceptedAt).toBeInstanceOf(Date);
      expect(member.joinedAt).toBeInstanceOf(Date);
      expect(member.createdAt).toBeInstanceOf(Date);
      expect(member.updatedAt).toBeInstanceOf(Date);
    });
  });
});

import {
  validateNotRemovingLastOwner,
  validateNotDemotingLastOwner,
  validateRoleHierarchy,
  validateInvitationTimestamps,
} from '../organization-member.validator';
import { OrganizationRole } from '../../../users/enums/organization-role.enum';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrganizationMember } from '../../entities/organization-member.entity';

describe('Organization Member Validators', () => {
  describe('validateNotRemovingLastOwner', () => {
    let mockRepository: jest.Mocked<Repository<OrganizationMember>>;

    beforeEach(() => {
      mockRepository = {
        findOne: jest.fn(),
        count: jest.fn(),
      } as any;
    });

    it('should allow removing non-owner member', async () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_MEMBER;
      mockRepository.findOne.mockResolvedValue(member);

      await expect(
        validateNotRemovingLastOwner('org-123', 'user-456', mockRepository)
      ).resolves.not.toThrow();

      expect(mockRepository.count).not.toHaveBeenCalled();
    });

    it('should allow removing owner when multiple owners exist', async () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.OWNER;
      mockRepository.findOne.mockResolvedValue(member);
      mockRepository.count.mockResolvedValue(2);

      await expect(
        validateNotRemovingLastOwner('org-123', 'user-456', mockRepository)
      ).resolves.not.toThrow();

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          role: OrganizationRole.OWNER,
        },
      });
    });

    it('should throw when removing the last owner', async () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.OWNER;
      mockRepository.findOne.mockResolvedValue(member);
      mockRepository.count.mockResolvedValue(1);

      await expect(
        validateNotRemovingLastOwner('org-123', 'user-456', mockRepository)
      ).rejects.toThrow(ConflictException);

      await expect(
        validateNotRemovingLastOwner('org-123', 'user-456', mockRepository)
      ).rejects.toThrow('Cannot remove the last owner');
    });

    it('should allow when member not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        validateNotRemovingLastOwner('org-123', 'user-456', mockRepository)
      ).resolves.not.toThrow();
    });
  });

  describe('validateNotDemotingLastOwner', () => {
    let mockRepository: jest.Mocked<Repository<OrganizationMember>>;

    beforeEach(() => {
      mockRepository = {
        findOne: jest.fn(),
        count: jest.fn(),
      } as any;
    });

    it('should allow promoting to owner', async () => {
      await expect(
        validateNotDemotingLastOwner('org-123', 'user-456', OrganizationRole.OWNER, mockRepository)
      ).resolves.not.toThrow();

      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('should allow demoting non-owner', async () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.ORG_ADMIN;
      mockRepository.findOne.mockResolvedValue(member);

      await expect(
        validateNotDemotingLastOwner('org-123', 'user-456', OrganizationRole.ORG_MEMBER, mockRepository)
      ).resolves.not.toThrow();

      expect(mockRepository.count).not.toHaveBeenCalled();
    });

    it('should allow demoting owner when multiple owners exist', async () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.OWNER;
      mockRepository.findOne.mockResolvedValue(member);
      mockRepository.count.mockResolvedValue(2);

      await expect(
        validateNotDemotingLastOwner('org-123', 'user-456', OrganizationRole.ORG_ADMIN, mockRepository)
      ).resolves.not.toThrow();
    });

    it('should throw when demoting the last owner', async () => {
      const member = new OrganizationMember();
      member.role = OrganizationRole.OWNER;
      mockRepository.findOne.mockResolvedValue(member);
      mockRepository.count.mockResolvedValue(1);

      await expect(
        validateNotDemotingLastOwner('org-123', 'user-456', OrganizationRole.ORG_ADMIN, mockRepository)
      ).rejects.toThrow(ConflictException);

      await expect(
        validateNotDemotingLastOwner('org-123', 'user-456', OrganizationRole.ORG_ADMIN, mockRepository)
      ).rejects.toThrow('Cannot demote the last owner');
    });

    it('should allow when member not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        validateNotDemotingLastOwner('org-123', 'user-456', OrganizationRole.ORG_MEMBER, mockRepository)
      ).resolves.not.toThrow();
    });
  });

  describe('validateRoleHierarchy', () => {
    it('should allow OWNER to assign any role', () => {
      expect(() =>
        validateRoleHierarchy(OrganizationRole.OWNER, OrganizationRole.OWNER)
      ).not.toThrow();
      expect(() =>
        validateRoleHierarchy(OrganizationRole.OWNER, OrganizationRole.ORG_ADMIN)
      ).not.toThrow();
      expect(() =>
        validateRoleHierarchy(OrganizationRole.OWNER, OrganizationRole.ORG_MEMBER)
      ).not.toThrow();
      expect(() =>
        validateRoleHierarchy(OrganizationRole.OWNER, OrganizationRole.GUEST)
      ).not.toThrow();
    });

    it('should only allow OWNER to assign OWNER role', () => {
      expect(() =>
        validateRoleHierarchy(OrganizationRole.OWNER, OrganizationRole.OWNER)
      ).not.toThrow();

      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_ADMIN, OrganizationRole.OWNER)
      ).toThrow(BadRequestException);
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_ADMIN, OrganizationRole.OWNER)
      ).toThrow('Only organization owners can assign the owner role');
    });

    it('should allow ORG_ADMIN to assign lower roles', () => {
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_ADMIN)
      ).not.toThrow();
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_MEMBER)
      ).not.toThrow();
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_ADMIN, OrganizationRole.GUEST)
      ).not.toThrow();
    });

    it('should prevent assigning roles higher than actor role', () => {
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_MEMBER, OrganizationRole.ORG_ADMIN)
      ).toThrow(BadRequestException);
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_MEMBER, OrganizationRole.ORG_ADMIN)
      ).toThrow('Insufficient permissions');

      expect(() =>
        validateRoleHierarchy(OrganizationRole.GUEST, OrganizationRole.ORG_MEMBER)
      ).toThrow(BadRequestException);
    });

    it('should allow ORG_MEMBER to assign GUEST', () => {
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_MEMBER, OrganizationRole.GUEST)
      ).not.toThrow();
    });

    it('should prevent GUEST from managing members', () => {
      expect(() =>
        validateRoleHierarchy(OrganizationRole.GUEST, OrganizationRole.GUEST)
      ).toThrow(BadRequestException);
      expect(() =>
        validateRoleHierarchy(OrganizationRole.GUEST, OrganizationRole.GUEST)
      ).toThrow('Guests do not have permission');
    });

    it('should allow assigning same level role', () => {
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_ADMIN, OrganizationRole.ORG_ADMIN)
      ).not.toThrow();
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_MEMBER, OrganizationRole.ORG_MEMBER)
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

    it('should handle undefined timestamps', () => {
      expect(() => validateInvitationTimestamps(undefined, undefined, undefined)).not.toThrow();
    });

    it('should accept sequential timestamps with small intervals', () => {
      const invited = new Date();
      const accepted = new Date(invited.getTime() + 1);
      const joined = new Date(accepted.getTime() + 1);
      expect(() => validateInvitationTimestamps(invited, accepted, joined)).not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should validate complete owner protection workflow', async () => {
      const mockRepository = {
        findOne: jest.fn(),
        count: jest.fn(),
      } as any;

      // Scenario: Last owner tries to leave
      const lastOwner = new OrganizationMember();
      lastOwner.role = OrganizationRole.OWNER;
      mockRepository.findOne.mockResolvedValue(lastOwner);
      mockRepository.count.mockResolvedValue(1);

      await expect(
        validateNotRemovingLastOwner('org-123', 'user-456', mockRepository)
      ).rejects.toThrow('Cannot remove the last owner');

      await expect(
        validateNotDemotingLastOwner('org-123', 'user-456', OrganizationRole.ORG_ADMIN, mockRepository)
      ).rejects.toThrow('Cannot demote the last owner');
    });

    it('should validate complete role hierarchy enforcement', () => {
      // ORG_MEMBER should only manage GUEST
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_MEMBER, OrganizationRole.GUEST)
      ).not.toThrow();
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_MEMBER, OrganizationRole.ORG_MEMBER)
      ).not.toThrow();
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_MEMBER, OrganizationRole.ORG_ADMIN)
      ).toThrow(BadRequestException);
      expect(() =>
        validateRoleHierarchy(OrganizationRole.ORG_MEMBER, OrganizationRole.OWNER)
      ).toThrow(BadRequestException);

      // GUEST cannot manage anyone
      expect(() =>
        validateRoleHierarchy(OrganizationRole.GUEST, OrganizationRole.GUEST)
      ).toThrow(BadRequestException);
    });

    it('should validate invitation workflow timestamps correctly', () => {
      const baseTime = new Date('2025-01-01T10:00:00Z');
      const invited = new Date(baseTime);
      const accepted = new Date(baseTime.getTime() + 3600000); // 1 hour later
      const joined = new Date(baseTime.getTime() + 7200000); // 2 hours later

      // Valid workflow
      expect(() => validateInvitationTimestamps(invited, accepted, joined)).not.toThrow();

      // Invalid: accepted before invited
      expect(() =>
        validateInvitationTimestamps(accepted, invited, joined)
      ).toThrow(BadRequestException);

      // Invalid: joined before accepted
      expect(() =>
        validateInvitationTimestamps(invited, joined, accepted)
      ).toThrow(BadRequestException);
    });
  });
});

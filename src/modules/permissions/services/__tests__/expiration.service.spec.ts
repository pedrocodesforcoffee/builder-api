/**
 * Expiration Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExpirationService } from '../expiration.service';
import { InheritanceService } from '../inheritance.service';
import { ProjectMember } from '../../../projects/entities/project-member.entity';
import { ExpirationStatus } from '../../types/expiration.types';

describe('ExpirationService', () => {
  let service: ExpirationService;
  let projectMemberRepo: jest.Mocked<Repository<ProjectMember>>;
  let inheritanceService: jest.Mocked<InheritanceService>;

  const mockProjectMember = (overrides?: Partial<ProjectMember>): ProjectMember => {
    return {
      userId: 'user-1',
      projectId: 'project-1',
      role: 'subcontractor',
      expiresAt: new Date('2025-12-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as ProjectMember;
  };

  beforeEach(async () => {
    const mockProjectMemberRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    const mockInheritanceService = {
      getEffectiveRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpirationService,
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: mockProjectMemberRepo,
        },
        {
          provide: InheritanceService,
          useValue: mockInheritanceService,
        },
      ],
    }).compile();

    service = module.get<ExpirationService>(ExpirationService);
    projectMemberRepo = module.get(getRepositoryToken(ProjectMember));
    inheritanceService = module.get(InheritanceService);
  });

  describe('checkExpiration', () => {
    it('should return NO_EXPIRATION for inherited roles', async () => {
      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'project_admin',
        source: 'inherited',
        isInherited: true,
      });

      const result = await service.checkExpiration('user-1', 'project-1');

      expect(result.status).toBe(ExpirationStatus.NO_EXPIRATION);
      expect(result.isExpired).toBe(false);
      expect(inheritanceService.getEffectiveRole).toHaveBeenCalledWith(
        'user-1',
        'project-1',
      );
    });

    it('should return NO_EXPIRATION when membership has no expiration date', async () => {
      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: undefined }),
      );

      const result = await service.checkExpiration('user-1', 'project-1');

      expect(result.status).toBe(ExpirationStatus.NO_EXPIRATION);
      expect(result.isExpired).toBe(false);
      expect(result.expiresAt).toBeUndefined();
    });

    it('should return EXPIRED when membership has expired', async () => {
      const pastDate = new Date('2024-01-01');

      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: pastDate }),
      );

      const result = await service.checkExpiration('user-1', 'project-1');

      expect(result.status).toBe(ExpirationStatus.EXPIRED);
      expect(result.isExpired).toBe(true);
      expect(result.expiresAt).toEqual(pastDate);
      expect(result.daysUntilExpiration).toBe(0);
    });

    it('should return EXPIRING_SOON when membership expires within 7 days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: futureDate }),
      );

      const result = await service.checkExpiration('user-1', 'project-1');

      expect(result.status).toBe(ExpirationStatus.EXPIRING_SOON);
      expect(result.isExpired).toBe(false);
      expect(result.daysUntilExpiration).toBeGreaterThan(0);
      expect(result.daysUntilExpiration).toBeLessThanOrEqual(7);
    });

    it('should return ACTIVE when membership expires more than 7 days away', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: futureDate }),
      );

      const result = await service.checkExpiration('user-1', 'project-1');

      expect(result.status).toBe(ExpirationStatus.ACTIVE);
      expect(result.isExpired).toBe(false);
      expect(result.daysUntilExpiration).toBeGreaterThan(7);
    });

    it('should throw NotFoundException when membership not found', async () => {
      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkExpiration('user-1', 'project-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isExpired', () => {
    it('should return true for expired membership', async () => {
      const pastDate = new Date('2024-01-01');

      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: pastDate }),
      );

      const result = await service.isExpired('user-1', 'project-1');

      expect(result).toBe(true);
    });

    it('should return false for active membership', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: futureDate }),
      );

      const result = await service.isExpired('user-1', 'project-1');

      expect(result).toBe(false);
    });
  });

  describe('isExpiringSoon', () => {
    it('should return true when expiring within 7 days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: futureDate }),
      );

      const result = await service.isExpiringSoon('user-1', 'project-1', 7);

      expect(result).toBe(true);
    });

    it('should return false when expiring more than 7 days away', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: futureDate }),
      );

      const result = await service.isExpiringSoon('user-1', 'project-1', 7);

      expect(result).toBe(false);
    });

    it('should return false for membership with no expiration', async () => {
      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: undefined }),
      );

      const result = await service.isExpiringSoon('user-1', 'project-1', 7);

      expect(result).toBe(false);
    });

    it('should return false for already expired membership', async () => {
      const pastDate = new Date('2024-01-01');

      inheritanceService.getEffectiveRole.mockResolvedValue({
        effectiveRole: 'subcontractor',
        source: 'explicit',
        isInherited: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(
        mockProjectMember({ expiresAt: pastDate }),
      );

      const result = await service.isExpiringSoon('user-1', 'project-1', 7);

      expect(result).toBe(false);
    });
  });

  describe('extendExpiration', () => {
    it('should extend expiration date successfully', async () => {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 60);

      const membership = mockProjectMember({
        expiresAt: new Date(),
        expirationWarningNotifiedAt: new Date(),
        expirationFinalNotifiedAt: new Date(),
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);
      projectMemberRepo.save.mockResolvedValue({
        ...membership,
        expiresAt: newExpiresAt,
        expirationWarningNotifiedAt: undefined,
        expirationFinalNotifiedAt: undefined,
        expiredNotifiedAt: undefined,
      });

      const result = await service.extendExpiration(
        'user-1',
        'project-1',
        newExpiresAt,
        'Extended for additional work',
        'admin-1',
      );

      expect(result.expiresAt).toEqual(newExpiresAt);
      expect(result.expirationWarningNotifiedAt).toBeUndefined();
      expect(result.expirationFinalNotifiedAt).toBeUndefined();
      expect(projectMemberRepo.save).toHaveBeenCalled();
    });

    it('should throw error when new expiration date is in the past', async () => {
      const pastDate = new Date('2024-01-01');
      const membership = mockProjectMember();

      projectMemberRepo.findOne.mockResolvedValue(membership);

      await expect(
        service.extendExpiration(
          'user-1',
          'project-1',
          pastDate,
          'Invalid extension',
          'admin-1',
        ),
      ).rejects.toThrow('New expiration date must be in the future');
    });

    it('should approve pending renewal when extending', async () => {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 60);

      const membership = mockProjectMember({
        renewalRequested: true,
        renewalStatus: 'pending',
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);
      projectMemberRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity as ProjectMember),
      );

      const result = await service.extendExpiration(
        'user-1',
        'project-1',
        newExpiresAt,
        'Renewal approved',
        'admin-1',
      );

      expect(result.renewalStatus).toBe('approved');
      expect(result.renewalProcessedBy).toBe('admin-1');
      expect(result.renewalProcessedAt).toBeDefined();
    });

    it('should throw NotFoundException when membership not found', async () => {
      projectMemberRepo.findOne.mockResolvedValue(null);

      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 60);

      await expect(
        service.extendExpiration(
          'user-1',
          'project-1',
          newExpiresAt,
          'Extension',
          'admin-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeExpiration', () => {
    it('should remove expiration successfully', async () => {
      const membership = mockProjectMember({
        expiresAt: new Date(),
        expirationReason: 'Temporary access',
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);
      projectMemberRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity as ProjectMember),
      );

      const result = await service.removeExpiration(
        'user-1',
        'project-1',
        'admin-1',
        'Made permanent',
      );

      expect(result.expiresAt).toBeUndefined();
      expect(result.expirationReason).toBeUndefined();
      expect(projectMemberRepo.save).toHaveBeenCalled();
    });

    it('should approve pending renewal when removing expiration', async () => {
      const membership = mockProjectMember({
        expiresAt: new Date(),
        renewalRequested: true,
        renewalStatus: 'pending',
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);
      projectMemberRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity as ProjectMember),
      );

      const result = await service.removeExpiration(
        'user-1',
        'project-1',
        'admin-1',
        'Made permanent',
      );

      expect(result.renewalStatus).toBe('approved');
      expect(result.renewalProcessedBy).toBe('admin-1');
    });
  });

  describe('requestRenewal', () => {
    it('should create renewal request successfully', async () => {
      const membership = mockProjectMember({
        expiresAt: new Date(),
        renewalRequested: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);
      projectMemberRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity as ProjectMember),
      );

      const result = await service.requestRenewal(
        'user-1',
        'project-1',
        'user-1',
        'Need more time to complete work',
      );

      expect(result.renewalRequested).toBe(true);
      expect(result.renewalRequestedBy).toBe('user-1');
      expect(result.renewalStatus).toBe('pending');
      expect(result.renewalRequestedAt).toBeDefined();
    });

    it('should throw error when membership has no expiration', async () => {
      const membership = mockProjectMember({ expiresAt: undefined });

      projectMemberRepo.findOne.mockResolvedValue(membership);

      await expect(
        service.requestRenewal(
          'user-1',
          'project-1',
          'user-1',
          'Renewal reason',
        ),
      ).rejects.toThrow(
        'Cannot request renewal for membership without expiration',
      );
    });

    it('should throw error when renewal already pending', async () => {
      const membership = mockProjectMember({
        expiresAt: new Date(),
        renewalRequested: true,
        renewalStatus: 'pending',
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);

      await expect(
        service.requestRenewal(
          'user-1',
          'project-1',
          'user-1',
          'Renewal reason',
        ),
      ).rejects.toThrow('Renewal request already pending');
    });
  });

  describe('processRenewal', () => {
    it('should approve renewal successfully', async () => {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 60);

      const membership = mockProjectMember({
        expiresAt: new Date(),
        renewalRequested: true,
        renewalStatus: 'pending',
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);
      projectMemberRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity as ProjectMember),
      );

      const result = await service.processRenewal(
        'user-1',
        'project-1',
        true,
        'admin-1',
        'Approved extension',
        newExpiresAt,
      );

      expect(result.renewalStatus).toBe('approved');
      expect(result.renewalProcessedBy).toBe('admin-1');
      expect(result.expiresAt).toEqual(newExpiresAt);
    });

    it('should deny renewal successfully', async () => {
      const membership = mockProjectMember({
        expiresAt: new Date(),
        renewalRequested: true,
        renewalStatus: 'pending',
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);
      projectMemberRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity as ProjectMember),
      );

      const result = await service.processRenewal(
        'user-1',
        'project-1',
        false,
        'admin-1',
        'Project completed',
      );

      expect(result.renewalStatus).toBe('denied');
      expect(result.renewalProcessedBy).toBe('admin-1');
    });

    it('should throw error when no renewal request exists', async () => {
      const membership = mockProjectMember({
        renewalRequested: false,
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);

      await expect(
        service.processRenewal(
          'user-1',
          'project-1',
          true,
          'admin-1',
          'Reason',
        ),
      ).rejects.toThrow('No renewal request to process');
    });

    it('should throw error when renewal already processed', async () => {
      const membership = mockProjectMember({
        renewalRequested: true,
        renewalStatus: 'approved',
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);

      await expect(
        service.processRenewal(
          'user-1',
          'project-1',
          true,
          'admin-1',
          'Reason',
        ),
      ).rejects.toThrow('Renewal request already approved');
    });

    it('should throw error when approving without new expiration date', async () => {
      const membership = mockProjectMember({
        renewalRequested: true,
        renewalStatus: 'pending',
      });

      projectMemberRepo.findOne.mockResolvedValue(membership);

      await expect(
        service.processRenewal('user-1', 'project-1', true, 'admin-1'),
      ).rejects.toThrow('New expiration date required for approval');
    });
  });

  describe('getExpiringMemberships', () => {
    it('should return memberships expiring within specified days', async () => {
      const memberships = [
        mockProjectMember({ userId: 'user-1' }),
        mockProjectMember({ userId: 'user-2' }),
      ];

      projectMemberRepo.find.mockResolvedValue(memberships);

      const result = await service.getExpiringMemberships('project-1', 7);

      expect(result).toHaveLength(2);
      expect(projectMemberRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'project-1',
          }),
        }),
      );
    });
  });

  describe('getPendingRenewals', () => {
    it('should return pending renewal requests', async () => {
      const memberships = [
        mockProjectMember({
          renewalRequested: true,
          renewalStatus: 'pending',
        }),
      ];

      projectMemberRepo.find.mockResolvedValue(memberships);

      const result = await service.getPendingRenewals('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].renewalStatus).toBe('pending');
    });
  });
});

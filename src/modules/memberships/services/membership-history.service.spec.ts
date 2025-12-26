import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MembershipHistoryService } from './membership-history.service';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { PermissionService } from '../../permissions/services/permission.service';
import { ProjectRole } from '../../users/enums/project-role.enum';

describe('MembershipHistoryService', () => {
  let service: MembershipHistoryService;
  let projectMemberRepo: Repository<ProjectMember>;
  let projectRepo: Repository<Project>;
  let permissionService: PermissionService;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
  };

  const mockMembership = {
    id: 'membership-1',
    userId: 'user-1',
    projectId: 'project-1',
    role: ProjectRole.VIEWER,
    addedAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    addedBy: 'admin-1',
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipHistoryService,
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            hasPermission: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MembershipHistoryService>(MembershipHistoryService);
    projectMemberRepo = module.get<Repository<ProjectMember>>(
      getRepositoryToken(ProjectMember),
    );
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    permissionService = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMemberHistory', () => {
    it('should return member history', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue(mockMembership as any);

      const result = await service.getMemberHistory('project-1', 'user-1', 'admin-1');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.userName).toBe('Test User');
      expect(result.changes).toBeInstanceOf(Array);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(false);

      await expect(
        service.getMemberHistory('project-1', 'user-1', 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if membership not found', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getMemberHistory('project-1', 'user-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProjectStatistics', () => {
    it('should return project statistics', async () => {
      const mockMembers = [
        { role: 'PROJECT_ADMIN', scope: null, expiresAt: null },
        { role: 'VIEWER', scope: { tradeIds: ['trade-1'] }, expiresAt: null },
        { role: 'SUPERINTENDENT', scope: null, expiresAt: new Date('2025-12-31') },
      ];

      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(projectMemberRepo, 'find').mockResolvedValue(mockMembers as any);

      const result = await service.getProjectStatistics('project-1', 'admin-1');

      expect(result).toBeDefined();
      expect(result.totalMembers).toBe(3);
      expect(result.membersByRole['PROJECT_ADMIN']).toBe(1);
      expect(result.membersByRoleCategory.admin).toBe(1);
      expect(result.membersByRoleCategory.field).toBe(1);
      expect(result.membersByRoleCategory.view).toBe(1);
      expect(result.scopeStatistics.limited).toBe(1);
      expect(result.scopeStatistics.unrestricted).toBe(2);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(false);

      await expect(
        service.getProjectStatistics('project-1', 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if project not found', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getProjectStatistics('project-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate expiration statistics correctly', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days ahead
      const farFuture = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days ahead
      const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const mockMembers = [
        { role: ProjectRole.VIEWER, scope: null, expiresAt: null }, // active
        { role: ProjectRole.VIEWER, scope: null, expiresAt: future }, // active and expiring
        { role: ProjectRole.VIEWER, scope: null, expiresAt: farFuture }, // active
        { role: ProjectRole.VIEWER, scope: null, expiresAt: past }, // expired
      ];

      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(projectMemberRepo, 'find').mockResolvedValue(mockMembers as any);

      const result = await service.getProjectStatistics('project-1', 'admin-1');

      // Active includes all non-expired (null, future, farFuture)
      expect(result.expirationStatistics.active).toBe(3);
      // Expiring is a subset of active that expires within 30 days
      expect(result.expirationStatistics.expiring).toBe(1);
      expect(result.expirationStatistics.expired).toBe(1);
    });
  });

  describe('getPendingRenewals', () => {
    it('should return pending renewals', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const mockExpiringMembers = [
        {
          userId: 'user-1',
          projectId: 'project-1',
          role: ProjectRole.VIEWER,
          expiresAt: futureDate,
          expirationReason: 'Temporary access',
          expirationNotified: false,
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ];

      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(projectMemberRepo, 'find').mockResolvedValue(mockExpiringMembers as any);

      const result = await service.getPendingRenewals('project-1', 'admin-1', 30);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].daysRemaining).toBeGreaterThan(0);
      expect(result[0].daysRemaining).toBeLessThan(30);
    });

    it('should exclude already expired memberships', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const mockExpiringMembers = [
        {
          userId: 'user-1',
          projectId: 'project-1',
          role: ProjectRole.VIEWER,
          expiresAt: pastDate,
          expirationNotified: false,
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ];

      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(projectMemberRepo, 'find').mockResolvedValue(mockExpiringMembers as any);

      const result = await service.getPendingRenewals('project-1', 'admin-1', 30);

      expect(result).toHaveLength(0);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(false);

      await expect(
        service.getPendingRenewals('project-1', 'admin-1', 30),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

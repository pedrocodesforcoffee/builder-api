import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProjectMembershipService } from './project-membership.service';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { PermissionService } from '../../permissions/services/permission.service';
import { InheritanceService } from '../../permissions/services/inheritance.service';
import { ScopeService } from '../../permissions/services/scope.service';
import { ExpirationService } from '../../permissions/services/expiration.service';
import { ProjectRole } from '../../users/enums/project-role.enum';

describe('ProjectMembershipService', () => {
  let service: ProjectMembershipService;
  let projectMemberRepo: Repository<ProjectMember>;
  let orgMemberRepo: Repository<OrganizationMember>;
  let userRepo: Repository<User>;
  let projectRepo: Repository<Project>;
  let permissionService: PermissionService;
  let inheritanceService: InheritanceService;
  let scopeService: ScopeService;
  let expirationService: ExpirationService;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    organizationId: 'org-1',
    organization: { id: 'org-1' },
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@test.com',
    name: 'Test User',
  };

  const mockOrgMembership = {
    id: 'org-membership-1',
    userId: 'user-1',
    organizationId: 'org-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectMembershipService,
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              addOrderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
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
            clearPermissionCache: jest.fn(),
          },
        },
        {
          provide: InheritanceService,
          useValue: {
            hasInheritedAccess: jest.fn(),
          },
        },
        {
          provide: ScopeService,
          useValue: {
            validateScopeForRole: jest.fn(),
          },
        },
        {
          provide: ExpirationService,
          useValue: {
            validateExpirationDate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectMembershipService>(ProjectMembershipService);
    projectMemberRepo = module.get<Repository<ProjectMember>>(
      getRepositoryToken(ProjectMember),
    );
    orgMemberRepo = module.get<Repository<OrganizationMember>>(
      getRepositoryToken(OrganizationMember),
    );
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    permissionService = module.get<PermissionService>(PermissionService);
    inheritanceService = module.get<InheritanceService>(InheritanceService);
    scopeService = module.get<ScopeService>(ScopeService);
    expirationService = module.get<ExpirationService>(ExpirationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addProjectMember', () => {
    const dto = {
      userId: 'user-2',
      role: ProjectRole.VIEWER,
      sendNotification: true,
    };

    it('should successfully add a new project member', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(mockOrgMembership as any);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(false);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(projectMemberRepo, 'create').mockReturnValue({
        id: 'new-membership',
        userId: dto.userId,
        projectId: 'project-1',
        role: dto.role,
      } as any);
      jest.spyOn(projectMemberRepo, 'save').mockResolvedValue({
        id: 'new-membership',
      } as any);

      const result = await service.addProjectMember('project-1', dto, 'user-1');

      expect(result).toBeDefined();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(dto.userId);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.addProjectMember('project-1', dto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(false);

      await expect(
        service.addProjectMember('project-1', dto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.addProjectMember('project-1', dto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not org member', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.addProjectMember('project-1', dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user has inherited access', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(mockOrgMembership as any);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(true);

      await expect(
        service.addProjectMember('project-1', dto, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if user is already a member', async () => {
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(mockOrgMembership as any);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(false);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.addProjectMember('project-1', dto, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate scope if provided', async () => {
      const dtoWithScope = {
        ...dto,
        scope: { tradeIds: ['trade-1'] },
      };
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(mockOrgMembership as any);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(false);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(scopeService, 'validateScopeForRole').mockReturnValue({
        valid: false,
        reason: 'Invalid scope',
      });

      await expect(
        service.addProjectMember('project-1', dtoWithScope, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate expiration if provided', async () => {
      const dtoWithExpiration = {
        ...dto,
        expiresAt: '2025-12-31',
      };
      jest.spyOn(projectRepo, 'findOne').mockResolvedValue(mockProject as any);
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(mockOrgMembership as any);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(false);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(expirationService, 'validateExpirationDate').mockReturnValue({
        valid: false,
        reason: 'Invalid expiration date',
      });

      await expect(
        service.addProjectMember('project-1', dtoWithExpiration, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeProjectMember', () => {
    it('should successfully remove a project member', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(false);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue({
        id: 'membership-1',
        userId: 'user-2',
        projectId: 'project-1',
      } as any);
      jest.spyOn(projectMemberRepo, 'remove').mockResolvedValue({} as any);

      await service.removeProjectMember('project-1', 'user-2', 'user-1');

      expect(projectMemberRepo.remove).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith('user-2');
    });

    it('should throw BadRequestException if trying to remove inherited access', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(true);

      await expect(
        service.removeProjectMember('project-1', 'user-2', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if membership not found', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(false);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.removeProjectMember('project-1', 'user-2', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProjectMember', () => {
    const dto = { role: ProjectRole.PROJECT_ENGINEER };

    it('should successfully update a project member', async () => {
      const existingMembership = {
        id: 'membership-1',
        userId: 'user-2',
        projectId: 'project-1',
        role: ProjectRole.VIEWER,
        scope: null,
        expiresAt: null,
      };
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(false);
      jest.spyOn(projectMemberRepo, 'findOne').mockResolvedValue(existingMembership as any);
      jest.spyOn(projectMemberRepo, 'save').mockResolvedValue({
        ...existingMembership,
        role: dto.role,
      } as any);

      await service.updateProjectMember('project-1', 'user-2', dto, 'user-1');

      expect(projectMemberRepo.save).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith('user-2');
    });

    it('should throw BadRequestException if trying to modify inherited access', async () => {
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(inheritanceService, 'hasInheritedAccess').mockResolvedValue(true);

      await expect(
        service.updateProjectMember('project-1', 'user-2', dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

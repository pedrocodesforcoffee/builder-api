import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ProjectCascadeService } from '../project-cascade.service';
import { Project } from '../../../projects/entities/project.entity';
import { ProjectMember } from '../../../projects/entities/project-member.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { PermissionService } from '../../../permissions/services/permission.service';
import { ProjectRole } from '../../../users/enums/project-role.enum';

describe('ProjectCascadeService', () => {
  let service: ProjectCascadeService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let projectMemberRepository: jest.Mocked<Repository<ProjectMember>>;
  let permissionsService: jest.Mocked<PermissionService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockOrganization: Organization = {
    id: 'org-123',
    name: 'Test Org',
    description: 'Test Description',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    projects: [],
  };

  const mockProject: Project = {
    id: 'project-123',
    name: 'Test Project',
    description: 'Test Description',
    organizationId: 'org-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    organization: mockOrganization,
  };

  const mockProjectMember: ProjectMember = {
    id: 'project-member-123',
    userId: 'user-123',
    projectId: 'project-123',
    role: ProjectRole.ADMIN,
    addedBy: 'admin-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-123',
      email: 'admin@example.com',
      firstName: 'John',
      lastName: 'Doe',
    } as any,
    project: mockProject,
  };

  beforeEach(async () => {
    // Create mock query runner
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        find: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
      },
    } as any;

    // Create mock data source
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    // Create mock repositories
    const mockProjectRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockProjectMemberRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockOrganizationRepository = {
      findOne: jest.fn(),
    };

    const mockPermissionsService = {
      clearPermissionCache: jest.fn(),
      hasPermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectCascadeService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: mockProjectMemberRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ProjectCascadeService>(ProjectCascadeService);
    projectRepository = module.get(getRepositoryToken(Project));
    projectMemberRepository = module.get(getRepositoryToken(ProjectMember));
    permissionsService = module.get(PermissionService);
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteProject', () => {
    describe('successful deletion', () => {
      beforeEach(() => {
        projectRepository.findOne.mockResolvedValue(mockProject);
        permissionsService.hasPermission.mockResolvedValue(true);
        projectMemberRepository.find.mockResolvedValue([mockProjectMember]);
      });

      it('should delete project with soft delete by default', async () => {
        const result = await service.deleteProject('project-123', {
          deletedBy: 'user-123',
        });

        expect(result).toBeDefined();
        expect(result.projectId).toBe('project-123');
        expect(result.membersRemoved).toBe(1);
      });

      it('should remove all project members', async () => {
        await service.deleteProject('project-123', {
          deletedBy: 'user-123',
        });

        expect(projectMemberRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { projectId: 'project-123', isActive: true },
          }),
        );
      });

      it('should clear permission cache for all members', async () => {
        await service.deleteProject('project-123', {
          deletedBy: 'user-123',
        });

        expect(permissionsService.clearPermissionCache).toHaveBeenCalledWith('user-123');
      });

      it('should mark project as inactive with soft delete', async () => {
        await service.deleteProject('project-123', {
          deletedBy: 'user-123',
          softDelete: true,
        });

        expect(projectRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'project-123',
            isActive: false,
          }),
        );
      });

      it('should include deletion reason if provided', async () => {
        const result = await service.deleteProject('project-123', {
          deletedBy: 'user-123',
          reason: 'Project completed',
        });

        expect(result).toBeDefined();
      });

      it('should skip permission check when cascaded from organization', async () => {
        await service.deleteProject('project-123', {
          deletedBy: 'user-123',
          cascadedFrom: 'organization',
        });

        expect(permissionsService.hasPermission).not.toHaveBeenCalled();
      });
    });

    describe('permission validation', () => {
      beforeEach(() => {
        queryRunner.manager.findOne.mockResolvedValue(mockProject);
      });

      it('should check permissions when not cascaded', async () => {
        permissionsService.checkProjectPermission.mockResolvedValue(true);
        queryRunner.manager.find.mockResolvedValue([mockProjectMember]);
        queryRunner.manager.remove.mockResolvedValue(undefined);
        queryRunner.manager.save.mockResolvedValue({ ...mockProject, isActive: false });

        await service.deleteProject('project-123', {
          deletedBy: 'user-123',
        });

        expect(permissionsService.checkProjectPermission).toHaveBeenCalledWith(
          'user-123',
          'project-123',
          'project:delete',
        );
      });

      it('should throw ForbiddenException if user lacks permission', async () => {
        permissionsService.checkProjectPermission.mockResolvedValue(false);

        await expect(
          service.deleteProject('project-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow(ForbiddenException);

        await expect(
          service.deleteProject('project-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow('Insufficient permissions to delete project');

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException if project not found', async () => {
        queryRunner.manager.findOne.mockResolvedValue(null);

        await expect(
          service.deleteProject('nonexistent-project', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow(NotFoundException);

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });

      it('should rollback transaction on error', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockProject);
        permissionsService.checkProjectPermission.mockResolvedValue(true);
        queryRunner.manager.find.mockRejectedValue(new Error('Database error'));

        await expect(
          service.deleteProject('project-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow();

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalled();
      });

      it('should handle member removal errors', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockProject);
        permissionsService.checkProjectPermission.mockResolvedValue(true);
        queryRunner.manager.find.mockResolvedValue([mockProjectMember]);
        queryRunner.manager.remove.mockRejectedValue(new Error('Remove failed'));

        await expect(
          service.deleteProject('project-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow();

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });
    });
  });

  describe('restoreProject', () => {
    describe('successful restoration', () => {
      const deletedProject = { ...mockProject, isActive: false };

      beforeEach(() => {
        projectRepository.findOne.mockResolvedValue(deletedProject);
        projectRepository.save.mockResolvedValue({ ...deletedProject, isActive: true });
      });

      it('should restore a soft-deleted project', async () => {
        await service.restoreProject('project-123', {
          restoredBy: 'admin-123',
        });

        expect(projectRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'project-123',
            isActive: true,
          }),
        );
      });

      it('should find inactive project with organization relation', async () => {
        await service.restoreProject('project-123', {
          restoredBy: 'admin-123',
        });

        expect(projectRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'project-123', isActive: false },
          relations: ['organization'],
        });
      });

      it('should include restoration reason if provided', async () => {
        await service.restoreProject('project-123', {
          restoredBy: 'admin-123',
          reason: 'Project reactivated',
        });

        expect(projectRepository.save).toHaveBeenCalled();
      });
    });

    describe('organization validation', () => {
      it('should throw BadRequestException if organization is deleted', async () => {
        const deletedProject = {
          ...mockProject,
          isActive: false,
          organization: { ...mockOrganization, isActive: false },
        };
        projectRepository.findOne.mockResolvedValue(deletedProject);

        await expect(
          service.restoreProject('project-123', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.restoreProject('project-123', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow('Cannot restore project: parent organization is deleted');
      });

      it('should throw BadRequestException if organization does not exist', async () => {
        const deletedProject = {
          ...mockProject,
          isActive: false,
          organization: null,
        };
        projectRepository.findOne.mockResolvedValue(deletedProject);

        await expect(
          service.restoreProject('project-123', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow restoration if organization is active', async () => {
        const deletedProject = {
          ...mockProject,
          isActive: false,
          organization: { ...mockOrganization, isActive: true },
        };
        projectRepository.findOne.mockResolvedValue(deletedProject);
        projectRepository.save.mockResolvedValue({ ...deletedProject, isActive: true });

        await expect(
          service.restoreProject('project-123', {
            restoredBy: 'admin-123',
          }),
        ).resolves.toBeUndefined();
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException if project not found', async () => {
        projectRepository.findOne.mockResolvedValue(null);

        await expect(
          service.restoreProject('nonexistent-project', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should handle save errors', async () => {
        const deletedProject = { ...mockProject, isActive: false };
        projectRepository.findOne.mockResolvedValue(deletedProject);
        projectRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(
          service.restoreProject('project-123', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('getDeletionImpact', () => {
    beforeEach(() => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectMemberRepository.find.mockResolvedValue([mockProjectMember]);
    });

    it('should return deletion impact preview', async () => {
      const result = await service.getDeletionImpact('project-123');

      expect(result).toBeDefined();
      expect(result.projectId).toBe('project-123');
      expect(result.projectName).toBe('Test Project');
      expect(result.membersToBeRemoved).toHaveLength(1);
    });

    it('should include member details', async () => {
      const result = await service.getDeletionImpact('project-123');

      expect(result.membersToBeRemoved[0]).toMatchObject({
        userId: 'user-123',
        role: ProjectRole.ADMIN,
      });
    });

    it('should include organization information', async () => {
      const result = await service.getDeletionImpact('project-123');

      expect(result.organizationId).toBe('org-123');
      expect(result.organizationName).toBe('Test Org');
    });

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.getDeletionImpact('nonexistent-project')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle projects with no members', async () => {
      projectMemberRepository.find.mockResolvedValue([]);

      const result = await service.getDeletionImpact('project-123');

      expect(result.membersToBeRemoved).toHaveLength(0);
    });
  });

  describe('validateDeletion', () => {
    beforeEach(() => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      permissionsService.checkProjectPermission.mockResolvedValue(true);
    });

    it('should return canDelete true if user has permission', async () => {
      const result = await service.validateDeletion('project-123', 'user-123');

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('should return canDelete false if user lacks permission', async () => {
      permissionsService.checkProjectPermission.mockResolvedValue(false);

      const result = await service.validateDeletion('project-123', 'user-123');

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toContain('Insufficient permissions');
    });

    it('should check project:delete permission', async () => {
      await service.validateDeletion('project-123', 'user-123');

      expect(permissionsService.checkProjectPermission).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        'project:delete',
      );
    });

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.validateDeletion('nonexistent-project', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle project with many members', async () => {
      const manyMembers = Array.from({ length: 100 }, (_, i) => ({
        ...mockProjectMember,
        id: `member-${i}`,
        userId: `user-${i}`,
      }));

      queryRunner.manager.findOne.mockResolvedValue(mockProject);
      permissionsService.checkProjectPermission.mockResolvedValue(true);
      queryRunner.manager.find.mockResolvedValue(manyMembers);
      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockProject, isActive: false });

      const result = await service.deleteProject('project-123', {
        deletedBy: 'user-123',
      });

      expect(result.membersRemoved).toBe(100);
      expect(permissionsService.clearPermissionCache).toHaveBeenCalledTimes(100);
    });

    it('should handle cascaded deletion from organization', async () => {
      queryRunner.manager.findOne.mockResolvedValue(mockProject);
      queryRunner.manager.find.mockResolvedValue([mockProjectMember]);
      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockProject, isActive: false });

      await service.deleteProject('project-123', {
        deletedBy: 'user-123',
        cascadedFrom: 'organization',
      });

      // Should skip permission check
      expect(permissionsService.checkProjectPermission).not.toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle project with no members', async () => {
      queryRunner.manager.findOne.mockResolvedValue(mockProject);
      permissionsService.checkProjectPermission.mockResolvedValue(true);
      queryRunner.manager.find.mockResolvedValue([]);
      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockProject, isActive: false });

      const result = await service.deleteProject('project-123', {
        deletedBy: 'user-123',
      });

      expect(result.membersRemoved).toBe(0);
      expect(queryRunner.manager.remove).not.toHaveBeenCalled();
    });

    it('should handle restoration attempts for active project', async () => {
      // User tries to restore a project that's already active
      projectRepository.findOne.mockResolvedValue(null); // Not found in inactive projects

      await expect(
        service.restoreProject('project-123', {
          restoredBy: 'admin-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resource reassignment', () => {
    it('should track resource reassignment count', async () => {
      queryRunner.manager.findOne.mockResolvedValue(mockProject);
      permissionsService.checkProjectPermission.mockResolvedValue(true);
      queryRunner.manager.find.mockResolvedValue([mockProjectMember]);
      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockProject, isActive: false });

      const result = await service.deleteProject('project-123', {
        deletedBy: 'user-123',
      });

      expect(result).toHaveProperty('resourcesReassigned');
      expect(typeof result.resourcesReassigned).toBe('number');
    });

    it('should include resource count in deletion impact', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectMemberRepository.find.mockResolvedValue([mockProjectMember]);

      const result = await service.getDeletionImpact('project-123');

      expect(result).toHaveProperty('estimatedResourcesAffected');
      expect(typeof result.estimatedResourcesAffected).toBe('number');
    });
  });
});

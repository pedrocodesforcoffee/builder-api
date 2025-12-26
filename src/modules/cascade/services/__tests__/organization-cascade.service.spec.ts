import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { OrganizationCascadeService } from '../organization-cascade.service';
import { Organization } from '../../../organizations/entities/organization.entity';
import { OrganizationMember } from '../../../organizations/entities/organization-member.entity';
import { Project } from '../../../projects/entities/project.entity';
import { ProjectCascadeService } from '../project-cascade.service';
import { PermissionService } from '../../../permissions/services/permission.service';
import { OrganizationRole } from '../../../users/enums/organization-role.enum';

describe('OrganizationCascadeService', () => {
  let service: OrganizationCascadeService;
  let organizationRepository: jest.Mocked<Repository<Organization>>;
  let orgMemberRepository: jest.Mocked<Repository<OrganizationMember>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let projectCascadeService: jest.Mocked<ProjectCascadeService>;
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

  const mockOrgMember: OrganizationMember = {
    id: 'org-member-123',
    userId: 'user-123',
    organizationId: 'org-123',
    role: OrganizationRole.OWNER,
    addedBy: 'admin-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-123',
      email: 'owner@example.com',
      firstName: 'John',
      lastName: 'Doe',
    } as any,
    organization: mockOrganization,
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
    const mockOrganizationRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockOrgMemberRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockProjectRepository = {
      find: jest.fn(),
    };

    const mockProjectCascadeService = {
      deleteProject: jest.fn(),
    };

    const mockPermissionsService = {
      clearPermissionCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationCascadeService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: mockOrgMemberRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: ProjectCascadeService,
          useValue: mockProjectCascadeService,
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

    service = module.get<OrganizationCascadeService>(OrganizationCascadeService);
    organizationRepository = module.get(getRepositoryToken(Organization));
    orgMemberRepository = module.get(getRepositoryToken(OrganizationMember));
    projectRepository = module.get(getRepositoryToken(Project));
    projectCascadeService = module.get(ProjectCascadeService);
    permissionsService = module.get(PermissionService);
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteOrganization', () => {
    describe('successful deletion', () => {
      beforeEach(() => {
        queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
        orgMemberRepository.findOne.mockResolvedValue(mockOrgMember);
        queryRunner.manager.find.mockResolvedValueOnce([mockProject]);
        queryRunner.manager.find.mockResolvedValueOnce([mockOrgMember]);
        projectCascadeService.deleteProject.mockResolvedValue({
          projectId: 'project-123',
          membersRemoved: 5,
          resourcesReassigned: 10,
          errors: [],
        });
        queryRunner.manager.remove.mockResolvedValue(undefined);
        queryRunner.manager.save.mockResolvedValue({ ...mockOrganization, isActive: false });
      });

      it('should delete organization with soft delete by default', async () => {
        const result = await service.deleteOrganization('org-123', {
          deletedBy: 'user-123',
        });

        expect(result).toBeDefined();
        expect(result.organizationId).toBe('org-123');
        expect(result.projectsDeleted).toBe(1);
        expect(result.membersRemoved).toBe(1);
        expect(queryRunner.startTransaction).toHaveBeenCalled();
        expect(queryRunner.commitTransaction).toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalled();
      });

      it('should cascade delete all projects', async () => {
        await service.deleteOrganization('org-123', {
          deletedBy: 'user-123',
        });

        expect(projectCascadeService.deleteProject).toHaveBeenCalledWith(
          'project-123',
          expect.objectContaining({
            deletedBy: 'user-123',
            cascadedFrom: 'organization',
          }),
        );
      });

      it('should remove all organization members', async () => {
        await service.deleteOrganization('org-123', {
          deletedBy: 'user-123',
        });

        expect(queryRunner.manager.find).toHaveBeenCalledWith(
          OrganizationMember,
          expect.objectContaining({
            where: { organizationId: 'org-123' },
          }),
        );
        expect(queryRunner.manager.remove).toHaveBeenCalledWith([mockOrgMember]);
      });

      it('should clear permission cache for all members', async () => {
        await service.deleteOrganization('org-123', {
          deletedBy: 'user-123',
        });

        expect(permissionsService.clearPermissionCache).toHaveBeenCalledWith('user-123');
      });

      it('should mark organization as inactive with soft delete', async () => {
        await service.deleteOrganization('org-123', {
          deletedBy: 'user-123',
          softDelete: true,
        });

        expect(queryRunner.manager.save).toHaveBeenCalledWith(
          Organization,
          expect.objectContaining({
            id: 'org-123',
            isActive: false,
          }),
        );
      });

      it('should include deletion reason if provided', async () => {
        await service.deleteOrganization('org-123', {
          deletedBy: 'user-123',
          reason: 'Company closed',
        });

        expect(queryRunner.commitTransaction).toHaveBeenCalled();
      });
    });

    describe('owner validation', () => {
      it('should throw ForbiddenException if user is not an owner', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
        orgMemberRepository.findOne.mockResolvedValue({
          ...mockOrgMember,
          role: OrganizationRole.MEMBER,
        });

        await expect(
          service.deleteOrganization('org-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow(ForbiddenException);

        await expect(
          service.deleteOrganization('org-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow('Only organization owners can delete the organization');

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });

      it('should allow deletion if user is an owner', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
        orgMemberRepository.findOne.mockResolvedValue(mockOrgMember); // OWNER role
        queryRunner.manager.find.mockResolvedValueOnce([]);
        queryRunner.manager.find.mockResolvedValueOnce([mockOrgMember]);
        queryRunner.manager.remove.mockResolvedValue(undefined);
        queryRunner.manager.save.mockResolvedValue({ ...mockOrganization, isActive: false });

        await expect(
          service.deleteOrganization('org-123', {
            deletedBy: 'user-123',
          }),
        ).resolves.toBeDefined();
      });

      it('should throw ForbiddenException if user is not a member', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
        orgMemberRepository.findOne.mockResolvedValue(null);

        await expect(
          service.deleteOrganization('org-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException if organization not found', async () => {
        queryRunner.manager.findOne.mockResolvedValue(null);

        await expect(
          service.deleteOrganization('nonexistent-org', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow(NotFoundException);

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });

      it('should rollback transaction on error', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
        orgMemberRepository.findOne.mockResolvedValue(mockOrgMember);
        queryRunner.manager.find.mockRejectedValue(new Error('Database error'));

        await expect(
          service.deleteOrganization('org-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow();

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalled();
      });

      it('should handle project deletion errors', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
        orgMemberRepository.findOne.mockResolvedValue(mockOrgMember);
        queryRunner.manager.find.mockResolvedValueOnce([mockProject]);
        projectCascadeService.deleteProject.mockRejectedValue(new Error('Project deletion failed'));

        await expect(
          service.deleteOrganization('org-123', {
            deletedBy: 'user-123',
          }),
        ).rejects.toThrow();

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });
    });
  });

  describe('restoreOrganization', () => {
    describe('successful restoration', () => {
      const deletedOrganization = { ...mockOrganization, isActive: false };

      beforeEach(() => {
        organizationRepository.findOne.mockResolvedValue(deletedOrganization);
        organizationRepository.save.mockResolvedValue({ ...deletedOrganization, isActive: true });
      });

      it('should restore a soft-deleted organization', async () => {
        await service.restoreOrganization('org-123', {
          restoredBy: 'admin-123',
        });

        expect(organizationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'org-123',
            isActive: true,
          }),
        );
      });

      it('should find inactive organization', async () => {
        await service.restoreOrganization('org-123', {
          restoredBy: 'admin-123',
        });

        expect(organizationRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'org-123', isActive: false },
        });
      });

      it('should include restoration reason if provided', async () => {
        await service.restoreOrganization('org-123', {
          restoredBy: 'admin-123',
          reason: 'Company reopened',
        });

        expect(organizationRepository.save).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException if organization not found', async () => {
        organizationRepository.findOne.mockResolvedValue(null);

        await expect(
          service.restoreOrganization('nonexistent-org', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should handle save errors', async () => {
        const deletedOrganization = { ...mockOrganization, isActive: false };
        organizationRepository.findOne.mockResolvedValue(deletedOrganization);
        organizationRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(
          service.restoreOrganization('org-123', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('getDeletionImpact', () => {
    beforeEach(() => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      projectRepository.find.mockResolvedValue([mockProject]);
      orgMemberRepository.find.mockResolvedValue([mockOrgMember]);
    });

    it('should return deletion impact preview', async () => {
      const result = await service.getDeletionImpact('org-123');

      expect(result).toBeDefined();
      expect(result.organizationId).toBe('org-123');
      expect(result.organizationName).toBe('Test Org');
      expect(result.projectsToBeDeleted).toHaveLength(1);
      expect(result.membersToBeRemoved).toHaveLength(1);
    });

    it('should include project details', async () => {
      const result = await service.getDeletionImpact('org-123');

      expect(result.projectsToBeDeleted[0]).toMatchObject({
        projectId: 'project-123',
        projectName: 'Test Project',
      });
    });

    it('should include member details', async () => {
      const result = await service.getDeletionImpact('org-123');

      expect(result.membersToBeRemoved[0]).toMatchObject({
        userId: 'user-123',
        role: OrganizationRole.OWNER,
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.getDeletionImpact('nonexistent-org')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle organizations with no projects or members', async () => {
      projectRepository.find.mockResolvedValue([]);
      orgMemberRepository.find.mockResolvedValue([]);

      const result = await service.getDeletionImpact('org-123');

      expect(result.projectsToBeDeleted).toHaveLength(0);
      expect(result.membersToBeRemoved).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle organization with many projects', async () => {
      const manyProjects = Array.from({ length: 100 }, (_, i) => ({
        ...mockProject,
        id: `project-${i}`,
        name: `Project ${i}`,
      }));

      queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
      orgMemberRepository.findOne.mockResolvedValue(mockOrgMember);
      queryRunner.manager.find.mockResolvedValueOnce(manyProjects);
      queryRunner.manager.find.mockResolvedValueOnce([mockOrgMember]);
      projectCascadeService.deleteProject.mockResolvedValue({
        projectId: 'project-123',
        membersRemoved: 5,
        resourcesReassigned: 10,
        errors: [],
      });
      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockOrganization, isActive: false });

      const result = await service.deleteOrganization('org-123', {
        deletedBy: 'user-123',
      });

      expect(result.projectsDeleted).toBe(100);
      expect(projectCascadeService.deleteProject).toHaveBeenCalledTimes(100);
    });

    it('should handle organization with many members', async () => {
      const manyMembers = Array.from({ length: 50 }, (_, i) => ({
        ...mockOrgMember,
        id: `member-${i}`,
        userId: `user-${i}`,
      }));

      queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
      orgMemberRepository.findOne.mockResolvedValue(mockOrgMember);
      queryRunner.manager.find.mockResolvedValueOnce([]);
      queryRunner.manager.find.mockResolvedValueOnce(manyMembers);
      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockOrganization, isActive: false });

      const result = await service.deleteOrganization('org-123', {
        deletedBy: 'user-123',
      });

      expect(result.membersRemoved).toBe(50);
      expect(permissionsService.clearPermissionCache).toHaveBeenCalledTimes(50);
    });

    it('should continue deletion even if some project deletions have errors', async () => {
      const projects = [
        { ...mockProject, id: 'project-1', name: 'Project 1' },
        { ...mockProject, id: 'project-2', name: 'Project 2' },
      ];

      queryRunner.manager.findOne.mockResolvedValue(mockOrganization);
      orgMemberRepository.findOne.mockResolvedValue(mockOrgMember);
      queryRunner.manager.find.mockResolvedValueOnce(projects);
      queryRunner.manager.find.mockResolvedValueOnce([mockOrgMember]);

      projectCascadeService.deleteProject
        .mockResolvedValueOnce({
          projectId: 'project-1',
          membersRemoved: 5,
          resourcesReassigned: 10,
          errors: [],
        })
        .mockResolvedValueOnce({
          projectId: 'project-2',
          membersRemoved: 3,
          resourcesReassigned: 8,
          errors: ['Some error occurred'],
        });

      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockOrganization, isActive: false });

      const result = await service.deleteOrganization('org-123', {
        deletedBy: 'user-123',
      });

      expect(result.projectsDeleted).toBe(2);
      expect(result.errors).toHaveLength(1);
    });
  });
});

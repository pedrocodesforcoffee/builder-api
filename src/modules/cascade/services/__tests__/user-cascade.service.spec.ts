import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { UserCascadeService } from '../user-cascade.service';
import { User } from '../../../users/entities/user.entity';
import { OrganizationMember } from '../../../organizations/entities/organization-member.entity';
import { ProjectMember } from '../../../projects/entities/project-member.entity';
import { PermissionService } from '../../../permissions/services/permission.service';
import { OrganizationRole } from '../../../users/enums/organization-role.enum';
import { ProjectRole } from '../../../users/enums/project-role.enum';
import { SystemRole } from '../../../users/enums/system-role.enum';

describe('UserCascadeService', () => {
  let service: UserCascadeService;
  let userRepository: jest.Mocked<Repository<User>>;
  let orgMemberRepository: jest.Mocked<Repository<OrganizationMember>>;
  let projectMemberRepository: jest.Mocked<Repository<ProjectMember>>;
  let permissionsService: jest.Mocked<PermissionService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    systemRole: SystemRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    normalizeEmailBeforeInsert: jest.fn(),
    normalizeEmailBeforeUpdate: jest.fn(),
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    toJSON: jest.fn(),
  };

  const mockOrgMember: OrganizationMember = {
    id: 'org-member-123',
    userId: 'user-123',
    organizationId: 'org-123',
    role: OrganizationRole.MEMBER,
    addedBy: 'admin-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    organization: {
      id: 'org-123',
      name: 'Test Org',
      description: 'Test Description',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
      projects: [],
    },
  };

  const mockProjectMember: ProjectMember = {
    id: 'project-member-123',
    userId: 'user-123',
    projectId: 'project-123',
    role: ProjectRole.MEMBER,
    addedBy: 'admin-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    project: {
      id: 'project-123',
      name: 'Test Project',
      description: 'Test Description',
      organizationId: 'org-123',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [],
      organization: mockOrgMember.organization,
    },
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
        count: jest.fn(),
        remove: jest.fn(),
        save: jest.fn(),
      },
    } as any;

    // Create mock data source
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    // Create mock repositories
    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockOrgMemberRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    const mockProjectMemberRepository = {
      find: jest.fn(),
    };

    const mockPermissionsService = {
      clearPermissionCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCascadeService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: mockOrgMemberRepository,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: mockProjectMemberRepository,
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

    service = module.get<UserCascadeService>(UserCascadeService);
    userRepository = module.get(getRepositoryToken(User));
    orgMemberRepository = module.get(getRepositoryToken(OrganizationMember));
    projectMemberRepository = module.get(getRepositoryToken(ProjectMember));
    permissionsService = module.get(PermissionService);
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteUser', () => {
    describe('successful deletion', () => {
      beforeEach(() => {
        queryRunner.manager.findOne.mockResolvedValue(mockUser);
        queryRunner.manager.find.mockResolvedValueOnce([mockOrgMember]);
        queryRunner.manager.find.mockResolvedValueOnce([mockProjectMember]);
        queryRunner.manager.count.mockResolvedValue(2); // Not sole owner
        queryRunner.manager.remove.mockResolvedValue(undefined);
        queryRunner.manager.save.mockResolvedValue({ ...mockUser, isActive: false });
      });

      it('should delete user with soft delete by default', async () => {
        const result = await service.deleteUser('user-123', {
          deletedBy: 'admin-123',
        });

        expect(result).toBeDefined();
        expect(result.userId).toBe('user-123');
        expect(result.organizationMembershipsRemoved).toBe(1);
        expect(result.projectMembershipsRemoved).toBe(1);
        expect(queryRunner.startTransaction).toHaveBeenCalled();
        expect(queryRunner.commitTransaction).toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalled();
      });

      it('should remove all organization memberships', async () => {
        await service.deleteUser('user-123', {
          deletedBy: 'admin-123',
        });

        expect(queryRunner.manager.find).toHaveBeenCalledWith(
          OrganizationMember,
          expect.objectContaining({
            where: { userId: 'user-123' },
          }),
        );
        expect(queryRunner.manager.remove).toHaveBeenCalledWith([mockOrgMember]);
      });

      it('should remove all project memberships', async () => {
        await service.deleteUser('user-123', {
          deletedBy: 'admin-123',
        });

        expect(queryRunner.manager.find).toHaveBeenCalledWith(
          ProjectMember,
          expect.objectContaining({
            where: { userId: 'user-123' },
          }),
        );
        expect(queryRunner.manager.remove).toHaveBeenCalledWith([mockProjectMember]);
      });

      it('should clear permission cache', async () => {
        await service.deleteUser('user-123', {
          deletedBy: 'admin-123',
        });

        expect(permissionsService.clearPermissionCache).toHaveBeenCalledWith('user-123');
      });

      it('should mark user as inactive with soft delete', async () => {
        await service.deleteUser('user-123', {
          deletedBy: 'admin-123',
          softDelete: true,
        });

        expect(queryRunner.manager.save).toHaveBeenCalledWith(
          User,
          expect.objectContaining({
            id: 'user-123',
            isActive: false,
          }),
        );
      });

      it('should include deletion reason if provided', async () => {
        await service.deleteUser('user-123', {
          deletedBy: 'admin-123',
          reason: 'Account closure requested',
        });

        expect(queryRunner.commitTransaction).toHaveBeenCalled();
      });
    });

    describe('sole owner protection', () => {
      beforeEach(() => {
        queryRunner.manager.findOne.mockResolvedValue(mockUser);
        queryRunner.manager.find.mockResolvedValueOnce([
          { ...mockOrgMember, role: OrganizationRole.OWNER },
        ]);
        queryRunner.manager.count.mockResolvedValue(1); // Sole owner
      });

      it('should throw BadRequestException if user is sole owner', async () => {
        await expect(
          service.deleteUser('user-123', {
            deletedBy: 'admin-123',
          }),
        ).rejects.toThrow(BadRequestException);

        await expect(
          service.deleteUser('user-123', {
            deletedBy: 'admin-123',
          }),
        ).rejects.toThrow('Cannot delete user: sole owner of organization');

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });

      it('should allow deletion if there are other owners', async () => {
        queryRunner.manager.count.mockResolvedValue(2); // Multiple owners
        queryRunner.manager.find.mockResolvedValueOnce([mockProjectMember]);
        queryRunner.manager.remove.mockResolvedValue(undefined);
        queryRunner.manager.save.mockResolvedValue({ ...mockUser, isActive: false });

        await expect(
          service.deleteUser('user-123', {
            deletedBy: 'admin-123',
          }),
        ).resolves.toBeDefined();
      });

      it('should allow deletion if user is not an owner', async () => {
        queryRunner.manager.find.mockResolvedValueOnce([mockOrgMember]); // MEMBER role
        queryRunner.manager.find.mockResolvedValueOnce([mockProjectMember]);
        queryRunner.manager.remove.mockResolvedValue(undefined);
        queryRunner.manager.save.mockResolvedValue({ ...mockUser, isActive: false });

        await expect(
          service.deleteUser('user-123', {
            deletedBy: 'admin-123',
          }),
        ).resolves.toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException if user not found', async () => {
        queryRunner.manager.findOne.mockResolvedValue(null);

        await expect(
          service.deleteUser('nonexistent-user', {
            deletedBy: 'admin-123',
          }),
        ).rejects.toThrow(NotFoundException);

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });

      it('should rollback transaction on error', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockUser);
        queryRunner.manager.find.mockRejectedValue(new Error('Database error'));

        await expect(
          service.deleteUser('user-123', {
            deletedBy: 'admin-123',
          }),
        ).rejects.toThrow();

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(queryRunner.release).toHaveBeenCalled();
      });

      it('should handle removal errors gracefully', async () => {
        queryRunner.manager.findOne.mockResolvedValue(mockUser);
        queryRunner.manager.find.mockResolvedValueOnce([mockOrgMember]);
        queryRunner.manager.find.mockResolvedValueOnce([mockProjectMember]);
        queryRunner.manager.count.mockResolvedValue(2);
        queryRunner.manager.remove.mockRejectedValue(new Error('Remove failed'));

        await expect(
          service.deleteUser('user-123', {
            deletedBy: 'admin-123',
          }),
        ).rejects.toThrow();

        expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      });
    });
  });

  describe('restoreUser', () => {
    describe('successful restoration', () => {
      const deletedUser = { ...mockUser, isActive: false };

      beforeEach(() => {
        userRepository.findOne.mockResolvedValue(deletedUser);
        userRepository.save.mockResolvedValue({ ...deletedUser, isActive: true });
      });

      it('should restore a soft-deleted user', async () => {
        await service.restoreUser('user-123', {
          restoredBy: 'admin-123',
        });

        expect(userRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'user-123',
            isActive: true,
          }),
        );
      });

      it('should find inactive user', async () => {
        await service.restoreUser('user-123', {
          restoredBy: 'admin-123',
        });

        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'user-123', isActive: false },
        });
      });

      it('should include restoration reason if provided', async () => {
        await service.restoreUser('user-123', {
          restoredBy: 'admin-123',
          reason: 'Account reactivation requested',
        });

        expect(userRepository.save).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should throw NotFoundException if user not found', async () => {
        userRepository.findOne.mockResolvedValue(null);

        await expect(
          service.restoreUser('nonexistent-user', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow(NotFoundException);
      });

      it('should handle save errors', async () => {
        const deletedUser = { ...mockUser, isActive: false };
        userRepository.findOne.mockResolvedValue(deletedUser);
        userRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(
          service.restoreUser('user-123', {
            restoredBy: 'admin-123',
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('getDeletionImpact', () => {
    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(mockUser);
      orgMemberRepository.find.mockResolvedValue([mockOrgMember]);
      projectMemberRepository.find.mockResolvedValue([mockProjectMember]);
    });

    it('should return deletion impact preview', async () => {
      const result = await service.getDeletionImpact('user-123');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
      expect(result.organizationMemberships).toHaveLength(1);
      expect(result.projectMemberships).toHaveLength(1);
    });

    it('should include organization details', async () => {
      const result = await service.getDeletionImpact('user-123');

      expect(result.organizationMemberships[0]).toMatchObject({
        organizationId: 'org-123',
        organizationName: 'Test Org',
        role: OrganizationRole.MEMBER,
      });
    });

    it('should include project details', async () => {
      const result = await service.getDeletionImpact('user-123');

      expect(result.projectMemberships[0]).toMatchObject({
        projectId: 'project-123',
        projectName: 'Test Project',
        role: ProjectRole.MEMBER,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getDeletionImpact('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle users with no memberships', async () => {
      orgMemberRepository.find.mockResolvedValue([]);
      projectMemberRepository.find.mockResolvedValue([]);

      const result = await service.getDeletionImpact('user-123');

      expect(result.organizationMemberships).toHaveLength(0);
      expect(result.projectMemberships).toHaveLength(0);
    });
  });

  describe('validateDeletion', () => {
    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(mockUser);
      orgMemberRepository.find.mockResolvedValue([mockOrgMember]);
      orgMemberRepository.count.mockResolvedValue(2); // Not sole owner
    });

    it('should return canDelete true if no blockers', async () => {
      const result = await service.validateDeletion('user-123');

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('should return canDelete false if user is sole owner', async () => {
      orgMemberRepository.find.mockResolvedValue([
        { ...mockOrgMember, role: OrganizationRole.OWNER },
      ]);
      orgMemberRepository.count.mockResolvedValue(1);

      const result = await service.validateDeletion('user-123');

      expect(result.canDelete).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toContain('sole owner');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateDeletion('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow deletion if user is owner with other owners', async () => {
      orgMemberRepository.find.mockResolvedValue([
        { ...mockOrgMember, role: OrganizationRole.OWNER },
      ]);
      orgMemberRepository.count.mockResolvedValue(3); // Multiple owners

      const result = await service.validateDeletion('user-123');

      expect(result.canDelete).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle user with many memberships', async () => {
      const manyOrgMembers = Array.from({ length: 50 }, (_, i) => ({
        ...mockOrgMember,
        id: `org-member-${i}`,
        organizationId: `org-${i}`,
      }));

      queryRunner.manager.findOne.mockResolvedValue(mockUser);
      queryRunner.manager.find.mockResolvedValueOnce(manyOrgMembers);
      queryRunner.manager.find.mockResolvedValueOnce([]);
      queryRunner.manager.count.mockResolvedValue(2);
      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.deleteUser('user-123', {
        deletedBy: 'admin-123',
      });

      expect(result.organizationMembershipsRemoved).toBe(50);
    });

    it('should handle concurrent deletion attempts', async () => {
      queryRunner.manager.findOne.mockResolvedValue(mockUser);
      queryRunner.manager.find.mockResolvedValueOnce([mockOrgMember]);
      queryRunner.manager.find.mockResolvedValueOnce([]);
      queryRunner.manager.count.mockResolvedValue(2);
      queryRunner.manager.remove.mockResolvedValue(undefined);
      queryRunner.manager.save.mockResolvedValue({ ...mockUser, isActive: false });

      const promise1 = service.deleteUser('user-123', { deletedBy: 'admin-1' });
      const promise2 = service.deleteUser('user-123', { deletedBy: 'admin-2' });

      await Promise.all([promise1, promise2]);

      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(2);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrganizationMembershipService } from './organization-membership.service';
import { OrganizationMember } from '../../organizations/entities/organization-member.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Project } from '../../projects/entities/project.entity';
import { PermissionService } from '../../permissions/services/permission.service';
import { OrganizationRole } from '../../users/enums/organization-role.enum';

describe('OrganizationMembershipService', () => {
  let service: OrganizationMembershipService;
  let orgMemberRepo: Repository<OrganizationMember>;
  let projectMemberRepo: Repository<ProjectMember>;
  let userRepo: Repository<User>;
  let organizationRepo: Repository<Organization>;
  let projectRepo: Repository<Project>;
  let permissionService: PermissionService;

  const mockOrganization = {
    id: 'org-1',
    name: 'Test Org',
  };

  const mockRequestingUser = {
    id: 'user-1',
    email: 'admin@test.com',
    name: 'Admin User',
  };

  const mockTargetUser = {
    id: 'user-2',
    email: 'member@test.com',
    name: 'Member User',
    isActive: true,
  };

  const mockOwnerMembership = {
    id: 'membership-1',
    userId: 'user-1',
    organizationId: 'org-1',
    role: OrganizationRole.OWNER,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationMembershipService,
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            clearPermissionCache: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationMembershipService>(
      OrganizationMembershipService,
    );
    orgMemberRepo = module.get<Repository<OrganizationMember>>(
      getRepositoryToken(OrganizationMember),
    );
    projectMemberRepo = module.get<Repository<ProjectMember>>(
      getRepositoryToken(ProjectMember),
    );
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    organizationRepo = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    projectRepo = module.get<Repository<Project>>(getRepositoryToken(Project));
    permissionService = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addOrganizationMember', () => {
    const dto = {
      email: 'newmember@test.com',
      role: OrganizationRole.ORG_MEMBER,
      sendInvite: true,
    };

    it('should successfully add a new member', async () => {
      jest.spyOn(organizationRepo, 'findOne').mockResolvedValue(mockOrganization as any);
      jest.spyOn(orgMemberRepo, 'findOne')
        .mockResolvedValueOnce(mockOwnerMembership as any) // Requesting user check
        .mockResolvedValueOnce(null) // Existing member check
        .mockResolvedValueOnce({ // Final fetch with user
          id: 'new-membership',
          user: mockTargetUser,
        } as any);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockTargetUser as any);
      jest.spyOn(orgMemberRepo, 'create').mockReturnValue({
        id: 'new-membership',
        userId: 'user-2',
        organizationId: 'org-1',
        role: OrganizationRole.ORG_MEMBER,
      } as any);
      jest.spyOn(orgMemberRepo, 'save').mockResolvedValue({
        id: 'new-membership',
      } as any);

      const result = await service.addOrganizationMember('org-1', dto, 'user-1');

      expect(result).toBeDefined();
      expect(organizationRepo.findOne).toHaveBeenCalledWith({ where: { id: 'org-1' } });
      expect(permissionService.clearPermissionCache).toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      jest.spyOn(organizationRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.addOrganizationMember('org-1', dto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requesting user is not a member', async () => {
      jest.spyOn(organizationRepo, 'findOne').mockResolvedValue(mockOrganization as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.addOrganizationMember('org-1', dto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if requesting user is not owner/admin', async () => {
      jest.spyOn(organizationRepo, 'findOne').mockResolvedValue(mockOrganization as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue({
        ...mockOwnerMembership,
        role: OrganizationRole.ORG_MEMBER,
      } as any);

      await expect(
        service.addOrganizationMember('org-1', dto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if non-owner tries to create owner', async () => {
      const ownerDto = { ...dto, role: OrganizationRole.OWNER };
      jest.spyOn(organizationRepo, 'findOne').mockResolvedValue(mockOrganization as any);
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue({
        ...mockOwnerMembership,
        role: OrganizationRole.ORG_ADMIN,
      } as any);

      await expect(
        service.addOrganizationMember('org-1', ownerDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if user is already a member', async () => {
      jest.spyOn(organizationRepo, 'findOne').mockResolvedValue(mockOrganization as any);
      jest.spyOn(orgMemberRepo, 'findOne')
        .mockResolvedValueOnce(mockOwnerMembership as any)
        .mockResolvedValueOnce({ id: 'existing' } as any);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockTargetUser as any);

      await expect(
        service.addOrganizationMember('org-1', dto, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create new user if not found', async () => {
      jest.spyOn(organizationRepo, 'findOne').mockResolvedValue(mockOrganization as any);
      jest.spyOn(orgMemberRepo, 'findOne')
        .mockResolvedValueOnce(mockOwnerMembership as any)
        .mockResolvedValueOnce(null);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepo, 'create').mockReturnValue({
        email: dto.email,
        name: 'newmember',
        isActive: false,
      } as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue({
        id: 'new-user',
        email: dto.email,
      } as any);
      jest.spyOn(orgMemberRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(orgMemberRepo, 'save').mockResolvedValue({ id: 'new-membership' } as any);

      await service.addOrganizationMember('org-1', dto, 'user-1');

      expect(userRepo.create).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
    });
  });

  describe('removeOrganizationMember', () => {
    it('should successfully remove a member', async () => {
      jest.spyOn(orgMemberRepo, 'findOne')
        .mockResolvedValueOnce(mockOwnerMembership as any)
        .mockResolvedValueOnce({
          id: 'membership-2',
          role: OrganizationRole.ORG_MEMBER,
        } as any);
      jest.spyOn(orgMemberRepo, 'count').mockResolvedValue(2);
      jest.spyOn(orgMemberRepo, 'remove').mockResolvedValue({} as any);

      await service.removeOrganizationMember('org-1', 'user-2', 'user-1', false);

      expect(orgMemberRepo.remove).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith('user-2');
    });

    it('should throw BadRequestException when removing last owner', async () => {
      jest.spyOn(orgMemberRepo, 'findOne')
        .mockResolvedValueOnce(mockOwnerMembership as any)
        .mockResolvedValueOnce({
          id: 'membership-2',
          role: OrganizationRole.OWNER,
        } as any);
      jest.spyOn(orgMemberRepo, 'count').mockResolvedValue(1);

      await expect(
        service.removeOrganizationMember('org-1', 'user-2', 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to remove self', async () => {
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(mockOwnerMembership as any);

      await expect(
        service.removeOrganizationMember('org-1', 'user-1', 'user-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove from projects when removeFromProjects is true', async () => {
      const mockProjects = [
        { id: 'project-1' },
        { id: 'project-2' },
      ];
      jest.spyOn(orgMemberRepo, 'findOne')
        .mockResolvedValueOnce(mockOwnerMembership as any)
        .mockResolvedValueOnce({
          id: 'membership-2',
          role: OrganizationRole.ORG_MEMBER,
        } as any);
      jest.spyOn(orgMemberRepo, 'count').mockResolvedValue(2);
      jest.spyOn(projectRepo, 'find').mockResolvedValue(mockProjects as any);
      jest.spyOn(projectMemberRepo, 'delete').mockResolvedValue({} as any);
      jest.spyOn(orgMemberRepo, 'remove').mockResolvedValue({} as any);

      await service.removeOrganizationMember('org-1', 'user-2', 'user-1', true);

      expect(projectMemberRepo.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateOrganizationMemberRole', () => {
    const dto = { role: OrganizationRole.ORG_ADMIN };

    it('should successfully update member role', async () => {
      const memberToUpdate = {
        id: 'membership-2',
        userId: 'user-2',
        organizationId: 'org-1',
        role: OrganizationRole.ORG_MEMBER,
      };
      jest.spyOn(orgMemberRepo, 'findOne')
        .mockResolvedValueOnce(mockOwnerMembership as any)
        .mockResolvedValueOnce(memberToUpdate as any);
      jest.spyOn(orgMemberRepo, 'save').mockResolvedValue({
        ...memberToUpdate,
        role: OrganizationRole.ORG_ADMIN,
      } as any);

      await service.updateOrganizationMemberRole('org-1', 'user-2', dto, 'user-1');

      expect(orgMemberRepo.save).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith('user-2');
    });

    it('should throw BadRequestException when updating own role', async () => {
      jest.spyOn(orgMemberRepo, 'findOne').mockResolvedValue(mockOwnerMembership as any);

      await expect(
        service.updateOrganizationMemberRole('org-1', 'user-1', dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when demoting last owner', async () => {
      jest.spyOn(orgMemberRepo, 'findOne')
        .mockResolvedValueOnce(mockOwnerMembership as any)
        .mockResolvedValueOnce({
          id: 'membership-2',
          role: OrganizationRole.OWNER,
        } as any);
      jest.spyOn(orgMemberRepo, 'count').mockResolvedValue(1);

      await expect(
        service.updateOrganizationMemberRole('org-1', 'user-2', dto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

/**
 * Inheritance Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InheritanceService } from '../inheritance.service';
import { User } from '../../../users/entities/user.entity';
import { Project } from '../../../projects/entities/project.entity';
import { Organization } from '../../../organizations/entities/organization.entity';
import { ProjectMember } from '../../../projects/entities/project-member.entity';
import { OrganizationMember } from '../../../organizations/entities/organization-member.entity';
import { ProjectRole } from '../../../users/enums/project-role.enum';
import { OrganizationRole } from '../../../users/enums/organization-role.enum';
import { SystemRole } from '../../../users/enums/system-role.enum';

describe('InheritanceService', () => {
  let service: InheritanceService;
  let userRepo: Repository<User>;
  let projectRepo: Repository<Project>;
  let organizationRepo: Repository<Organization>;
  let projectMemberRepo: Repository<ProjectMember>;
  let organizationMemberRepo: Repository<OrganizationMember>;

  // Mock repositories
  const mockUserRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockProjectRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrganizationRepo = {
    findOne: jest.fn(),
  };

  const mockProjectMemberRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrganizationMemberRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InheritanceService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepo,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepo,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: mockProjectMemberRepo,
        },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: mockOrganizationMemberRepo,
        },
      ],
    }).compile();

    service = module.get<InheritanceService>(InheritanceService);
    userRepo = module.get(getRepositoryToken(User));
    projectRepo = module.get(getRepositoryToken(Project));
    organizationRepo = module.get(getRepositoryToken(Organization));
    projectMemberRepo = module.get(getRepositoryToken(ProjectMember));
    organizationMemberRepo = module.get(getRepositoryToken(OrganizationMember));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getEffectiveRole', () => {
    it('should return PROJECT_ADMIN for system admin', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.SYSTEM_ADMIN,
        isSystemAdmin: () => true,
      });

      const result = await service.getEffectiveRole(userId, projectId);

      expect(result.effectiveRole).toBe(ProjectRole.PROJECT_ADMIN);
      expect(result.source).toBe('system_admin');
      expect(result.isInherited).toBe(true);
    });

    it('should return PROJECT_ADMIN for org OWNER', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.OWNER,
      });

      const result = await service.getEffectiveRole(userId, projectId);

      expect(result.effectiveRole).toBe(ProjectRole.PROJECT_ADMIN);
      expect(result.source).toBe('org_owner');
      expect(result.isInherited).toBe(true);
      expect(result.organizationRole).toBe(OrganizationRole.OWNER);
    });

    it('should return PROJECT_ADMIN for org ORG_ADMIN', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.ORG_ADMIN,
      });

      const result = await service.getEffectiveRole(userId, projectId);

      expect(result.effectiveRole).toBe(ProjectRole.PROJECT_ADMIN);
      expect(result.source).toBe('org_admin');
      expect(result.isInherited).toBe(true);
      expect(result.organizationRole).toBe(OrganizationRole.ORG_ADMIN);
    });

    it('should return null for org ORG_MEMBER without explicit membership', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.ORG_MEMBER,
      });

      mockProjectMemberRepo.findOne.mockResolvedValue(null);

      const result = await service.getEffectiveRole(userId, projectId);

      expect(result.effectiveRole).toBeNull();
      expect(result.source).toBe('none');
      expect(result.isInherited).toBe(false);
    });

    it('should return explicit role for org member with project membership', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.ORG_MEMBER,
      });

      mockProjectMemberRepo.findOne.mockResolvedValue({
        userId,
        projectId,
        role: ProjectRole.SUPERINTENDENT,
        scope: null,
        expiresAt: null,
      });

      const result = await service.getEffectiveRole(userId, projectId);

      expect(result.effectiveRole).toBe(ProjectRole.SUPERINTENDENT);
      expect(result.source).toBe('explicit');
      expect(result.isInherited).toBe(false);
      expect(result.projectRole).toBe(ProjectRole.SUPERINTENDENT);
    });

    it('should return null for expired explicit membership', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';
      const pastDate = new Date('2020-01-01');

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.ORG_MEMBER,
      });

      mockProjectMemberRepo.findOne.mockResolvedValue({
        userId,
        projectId,
        role: ProjectRole.SUPERINTENDENT,
        scope: null,
        expiresAt: pastDate,
      });

      const result = await service.getEffectiveRole(userId, projectId);

      expect(result.effectiveRole).toBeNull();
      expect(result.source).toBe('none');
      expect(result.isInherited).toBe(false);
    });

    it('should prioritize org owner over expired explicit membership', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';
      const pastDate = new Date('2020-01-01');

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.OWNER,
      });

      // Explicit membership exists but is expired - should be ignored
      mockProjectMemberRepo.findOne.mockResolvedValue({
        userId,
        projectId,
        role: ProjectRole.VIEWER,
        scope: null,
        expiresAt: pastDate,
      });

      const result = await service.getEffectiveRole(userId, projectId);

      expect(result.effectiveRole).toBe(ProjectRole.PROJECT_ADMIN);
      expect(result.source).toBe('org_owner');
      expect(result.isInherited).toBe(true);
    });
  });

  describe('canChangeProjectRole', () => {
    it('should not allow changing role for system admin', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.SYSTEM_ADMIN,
        isSystemAdmin: () => true,
      });

      const result = await service.canChangeProjectRole(
        userId,
        projectId,
        ProjectRole.VIEWER,
        'requester-1',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('system admin');
    });

    it('should not allow changing role for org owner', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      mockUserRepo.findOne.mockResolvedValueOnce({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.OWNER,
      });

      const result = await service.canChangeProjectRole(
        userId,
        projectId,
        ProjectRole.VIEWER,
        'requester-1',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('organization owner');
    });

    it('should not allow changing role for org admin', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      mockUserRepo.findOne.mockResolvedValueOnce({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.ORG_ADMIN,
      });

      const result = await service.canChangeProjectRole(
        userId,
        projectId,
        ProjectRole.VIEWER,
        'requester-1',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('organization admin');
    });

    it('should allow changing role for explicit project member', async () => {
      const targetUserId = 'user-1';
      const requesterId = 'requester-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      // Target user - explicit member
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: targetUserId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValueOnce({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValueOnce({
        userId: targetUserId,
        organizationId,
        role: OrganizationRole.ORG_MEMBER,
      });

      mockProjectMemberRepo.findOne.mockResolvedValueOnce({
        userId: targetUserId,
        projectId,
        role: ProjectRole.VIEWER,
        scope: null,
        expiresAt: null,
      });

      // Requester - project admin
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: requesterId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValueOnce({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValueOnce({
        userId: requesterId,
        organizationId,
        role: OrganizationRole.ORG_ADMIN,
      });

      const result = await service.canChangeProjectRole(
        targetUserId,
        projectId,
        ProjectRole.SUPERINTENDENT,
        requesterId,
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('getInheritanceChain', () => {
    it('should return system admin chain', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.SYSTEM_ADMIN,
        isSystemAdmin: () => true,
      });

      const chain = await service.getInheritanceChain(userId, projectId);

      expect(chain.steps).toHaveLength(1);
      expect(chain.steps[0].type).toBe('system_admin');
      expect(chain.steps[0].role).toBe('SYSTEM_ADMIN');
      expect(chain.finalRole).toBe(ProjectRole.PROJECT_ADMIN);
      expect(chain.hasAccess).toBe(true);
    });

    it('should return org owner chain', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.OWNER,
      });

      const chain = await service.getInheritanceChain(userId, projectId);

      expect(chain.steps).toHaveLength(2);
      expect(chain.steps[0].type).toBe('organization');
      expect(chain.steps[0].role).toBe('OWNER');
      expect(chain.steps[1].type).toBe('project');
      expect(chain.steps[1].role).toBe('PROJECT_ADMIN');
      expect(chain.steps[1].source).toBe('Inheritance');
      expect(chain.finalRole).toBe(ProjectRole.PROJECT_ADMIN);
      expect(chain.hasAccess).toBe(true);
    });

    it('should return explicit membership chain', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'org-1';

      mockUserRepo.findOne.mockResolvedValue({
        id: userId,
        systemRole: SystemRole.USER,
        isSystemAdmin: () => false,
      });

      mockProjectRepo.findOne.mockResolvedValue({
        id: projectId,
        organizationId,
        organization: { id: organizationId, name: 'Test Org' },
      });

      mockOrganizationMemberRepo.findOne.mockResolvedValue({
        userId,
        organizationId,
        role: OrganizationRole.ORG_MEMBER,
      });

      mockProjectMemberRepo.findOne.mockResolvedValue({
        userId,
        projectId,
        role: ProjectRole.VIEWER,
        scope: null,
        expiresAt: null,
      });

      const chain = await service.getInheritanceChain(userId, projectId);

      expect(chain.steps).toHaveLength(2);
      expect(chain.steps[0].type).toBe('organization');
      expect(chain.steps[0].role).toBe('ORG_MEMBER');
      expect(chain.steps[1].type).toBe('project');
      expect(chain.steps[1].role).toBe('VIEWER');
      expect(chain.steps[1].source).toBe('ProjectMember');
      expect(chain.finalRole).toBe(ProjectRole.VIEWER);
      expect(chain.hasAccess).toBe(true);
    });
  });
});

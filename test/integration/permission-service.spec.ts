/**
 * PermissionService Integration Tests
 *
 * Tests permission checking with real database operations
 *
 * Run with: TEST_DB_STRATEGY=in-memory npm run test:integration
 */

import { DataSource } from 'typeorm';
import {
  TestDatabaseHelper,
  createTestDatabase,
  getDatabaseStrategy,
} from '@test/helpers/test-database.helper';
import { User } from '@modules/users/entities/user.entity';
import { Organization } from '@modules/organizations/entities/organization.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { OrganizationMember } from '@modules/organizations/entities/organization-member.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { OrganizationRole } from '@modules/users/enums/organization-role.enum';
import { ProjectRole } from '@modules/users/enums/project-role.enum';
import { SystemRole } from '@modules/users/enums/system-role.enum';
import { PermissionService } from '@modules/permissions/services/permission.service';
import { Permissions } from '@modules/permissions/constants/permissions.constants';

describe('PermissionService Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;
  let dataSource: DataSource;
  let permissionService: PermissionService;

  beforeAll(async () => {
    dbHelper = createTestDatabase({
      strategy: getDatabaseStrategy(),
      entities: [User, Organization, Project, OrganizationMember, ProjectMember],
      synchronize: true,
      logging: false,
    });

    dataSource = await dbHelper.initialize();

    // Create PermissionService instance
    const projectMemberRepo = dataSource.getRepository(ProjectMember);
    const orgMemberRepo = dataSource.getRepository(OrganizationMember);
    const projectRepo = dataSource.getRepository(Project);

    permissionService = new PermissionService(
      projectMemberRepo,
      orgMemberRepo,
      projectRepo,
    );
  });

  afterAll(async () => {
    await dbHelper.destroy();
  });

  afterEach(async () => {
    await dbHelper.cleanup();
    // Clear permission cache after each test
    await permissionService.cleanExpiredCache();
  });

  describe('Direct Project Member Permissions', () => {
    it('should grant PROJECT_ADMIN all permissions', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      // Create user, org, and project
      const user = await userRepo.save({
        email: 'admin@example.com',
        password: 'hashed',
        firstName: 'Admin',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      // Add user as PROJECT_ADMIN
      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.PROJECT_ADMIN,
      });

      // Test various permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_CREATE,
        ),
      ).toBe(true);

      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.RFI_APPROVE,
        ),
      ).toBe(true);

      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.SUBMITTAL_APPROVE,
        ),
      ).toBe(true);

      // Get all permissions
      const permissions = await permissionService.getUserPermissions(
        user.id,
        project.id,
      );
      expect(permissions).toContain('*:*:*');
    });

    it('should grant PROJECT_MANAGER appropriate permissions', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'manager@example.com',
        password: 'hashed',
        firstName: 'Manager',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.PROJECT_MANAGER,
      });

      // Should have document permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_CREATE,
        ),
      ).toBe(true);

      // Should have RFI permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.RFI_CREATE,
        ),
      ).toBe(true);

      // Should NOT have settings permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.SETTINGS_UPDATE,
        ),
      ).toBe(false);

      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.PERMISSIONS_UPDATE,
        ),
      ).toBe(false);
    });

    it('should grant VIEWER only read permissions', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'viewer@example.com',
        password: 'hashed',
        firstName: 'Viewer',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.VIEWER,
      });

      // Should have read permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_READ,
        ),
      ).toBe(true);

      // Should NOT have create permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_CREATE,
        ),
      ).toBe(false);

      // Should NOT have update permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_UPDATE,
        ),
      ).toBe(false);

      // Should NOT have delete permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_DELETE,
        ),
      ).toBe(false);
    });
  });

  describe('Organization Role Inheritance', () => {
    it('should grant PROJECT_ADMIN to ORG OWNER', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const orgMemberRepo = dbHelper.getRepository(OrganizationMember);

      const user = await userRepo.save({
        email: 'owner@example.com',
        password: 'hashed',
        firstName: 'Owner',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      // Add user as ORG OWNER (not project member)
      await orgMemberRepo.save({
        userId: user.id,
        organizationId: org.id,
        role: OrganizationRole.OWNER,
      });

      // Should inherit PROJECT_ADMIN permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_CREATE,
        ),
      ).toBe(true);

      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.SETTINGS_UPDATE,
        ),
      ).toBe(true);

      // Verify effective role
      const role = await permissionService.getEffectiveRole(user.id, project.id);
      expect(role).toBe(ProjectRole.PROJECT_ADMIN);
    });

    it('should grant PROJECT_ADMIN to ORG_ADMIN', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const orgMemberRepo = dbHelper.getRepository(OrganizationMember);

      const user = await userRepo.save({
        email: 'orgadmin@example.com',
        password: 'hashed',
        firstName: 'OrgAdmin',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      await orgMemberRepo.save({
        userId: user.id,
        organizationId: org.id,
        role: OrganizationRole.ORG_ADMIN,
      });

      // Should inherit PROJECT_ADMIN permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_CREATE,
        ),
      ).toBe(true);

      const role = await permissionService.getEffectiveRole(user.id, project.id);
      expect(role).toBe(ProjectRole.PROJECT_ADMIN);
    });

    it('should NOT grant automatic access to ORG_MEMBER', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const orgMemberRepo = dbHelper.getRepository(OrganizationMember);

      const user = await userRepo.save({
        email: 'orgmember@example.com',
        password: 'hashed',
        firstName: 'OrgMember',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      await orgMemberRepo.save({
        userId: user.id,
        organizationId: org.id,
        role: OrganizationRole.ORG_MEMBER,
      });

      // Should NOT have access
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_READ,
        ),
      ).toBe(false);

      const role = await permissionService.getEffectiveRole(user.id, project.id);
      expect(role).toBeNull();
    });
  });

  describe('Scope-Based Access Control', () => {
    it('should filter FOREMAN permissions by scope', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'foreman@example.com',
        password: 'hashed',
        firstName: 'Foreman',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      // Add foreman with electrical scope
      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.FOREMAN,
        scope: ['electrical', 'lighting'],
      });

      // Should have base permissions
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.PHOTO_CREATE,
        ),
      ).toBe(true);

      // Check scope access - electrical (should pass)
      expect(
        await permissionService.checkScopeAccess(
          user.id,
          project.id,
          'doc-123',
          ['electrical', 'floor-1'],
        ),
      ).toBe(true);

      // Check scope access - plumbing (should fail)
      expect(
        await permissionService.checkScopeAccess(
          user.id,
          project.id,
          'doc-456',
          ['plumbing', 'floor-2'],
        ),
      ).toBe(false);
    });

    it('should filter SUBCONTRACTOR permissions by scope', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'subcontractor@example.com',
        password: 'hashed',
        firstName: 'Sub',
        lastName: 'Contractor',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      // Add subcontractor with plumbing scope
      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.SUBCONTRACTOR,
        scope: { trades: ['plumbing', 'hvac'] },
      });

      // Check scope access - plumbing (should pass)
      expect(
        await permissionService.checkScopeAccess(
          user.id,
          project.id,
          'doc-123',
          { trades: ['plumbing'] },
        ),
      ).toBe(true);

      // Check scope access - electrical (should fail)
      expect(
        await permissionService.checkScopeAccess(
          user.id,
          project.id,
          'doc-456',
          { trades: ['electrical'] },
        ),
      ).toBe(false);
    });

    it('should NOT filter non-scope-limited roles', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'manager@example.com',
        password: 'hashed',
        firstName: 'Manager',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      // PROJECT_MANAGER is not scope-limited
      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.PROJECT_MANAGER,
      });

      // Should have access to any scope
      expect(
        await permissionService.checkScopeAccess(
          user.id,
          project.id,
          'doc-123',
          ['electrical'],
        ),
      ).toBe(true);

      expect(
        await permissionService.checkScopeAccess(
          user.id,
          project.id,
          'doc-456',
          ['plumbing'],
        ),
      ).toBe(true);
    });
  });

  describe('Expiration Handling', () => {
    it('should deny access for expired members', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'contractor@example.com',
        password: 'hashed',
        firstName: 'Contractor',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      // Add member with past expiration
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.SUBCONTRACTOR,
        expiresAt: pastDate,
      });

      // Should deny access
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_READ,
        ),
      ).toBe(false);
    });

    it('should allow access for non-expired members', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'contractor@example.com',
        password: 'hashed',
        firstName: 'Contractor',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      // Add member with future expiration
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.SUBCONTRACTOR,
        expiresAt: futureDate,
      });

      // Should allow access
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.SUBMITTAL_CREATE,
        ),
      ).toBe(true);
    });
  });

  describe('Bulk Permission Checks', () => {
    it('should efficiently check multiple permissions', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'engineer@example.com',
        password: 'hashed',
        firstName: 'Engineer',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.PROJECT_ENGINEER,
      });

      // Bulk check
      const permMap = await permissionService.getUserPermissionMap(
        user.id,
        project.id,
        [
          Permissions.DRAWING_CREATE,
          Permissions.DRAWING_UPDATE,
          Permissions.DRAWING_DELETE, // Should be false for engineer
          Permissions.RFI_CREATE,
          Permissions.RFI_RESPOND,
          Permissions.SUBMITTAL_APPROVE, // Should be false for engineer
        ],
      );

      expect(permMap[Permissions.DRAWING_CREATE]).toBe(true);
      expect(permMap[Permissions.DRAWING_UPDATE]).toBe(true);
      expect(permMap[Permissions.DRAWING_DELETE]).toBe(false);
      expect(permMap[Permissions.RFI_CREATE]).toBe(true);
      expect(permMap[Permissions.RFI_RESPOND]).toBe(true);
      expect(permMap[Permissions.SUBMITTAL_APPROVE]).toBe(false);
    });
  });

  describe('Cache Operations', () => {
    it('should cache permission checks', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'user@example.com',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.PROJECT_MANAGER,
      });

      // First call (cache miss)
      const start1 = Date.now();
      await permissionService.hasPermission(
        user.id,
        project.id,
        Permissions.DRAWING_CREATE,
      );
      const duration1 = Date.now() - start1;

      // Second call (cache hit)
      const start2 = Date.now();
      await permissionService.hasPermission(
        user.id,
        project.id,
        Permissions.DRAWING_CREATE,
      );
      const duration2 = Date.now() - start2;

      // Cache hit should be faster (though in test environment difference might be minimal)
      expect(duration2).toBeLessThanOrEqual(duration1);
    });

    it('should clear cache for specific user/project', async () => {
      const userRepo = dbHelper.getRepository(User);
      const orgRepo = dbHelper.getRepository(Organization);
      const projectRepo = dbHelper.getRepository(Project);
      const memberRepo = dbHelper.getRepository(ProjectMember);

      const user = await userRepo.save({
        email: 'user@example.com',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      const org = await orgRepo.save({
        name: 'Test Org',
        slug: 'test-org',
      });

      const project = await projectRepo.save({
        organizationId: org.id,
        name: 'Test Project',
        code: 'TEST-001',
        status: 'active',
      });

      await memberRepo.save({
        userId: user.id,
        projectId: project.id,
        role: ProjectRole.VIEWER,
      });

      // Check permission (builds cache)
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_READ,
        ),
      ).toBe(true);

      // Clear cache
      await permissionService.clearPermissionCache(user.id, project.id);

      // Next check should rebuild cache
      expect(
        await permissionService.hasPermission(
          user.id,
          project.id,
          Permissions.DRAWING_READ,
        ),
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return false for non-existent user', async () => {
      expect(
        await permissionService.hasPermission(
          'non-existent-user',
          'non-existent-project',
          Permissions.DRAWING_READ,
        ),
      ).toBe(false);
    });

    it('should return false for non-existent project', async () => {
      const userRepo = dbHelper.getRepository(User);

      const user = await userRepo.save({
        email: 'user@example.com',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        systemRole: SystemRole.USER,
      });

      expect(
        await permissionService.hasPermission(
          user.id,
          'non-existent-project',
          Permissions.DRAWING_READ,
        ),
      ).toBe(false);
    });
  });
});
